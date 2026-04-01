/**
 * CFP Tags Tab Component
 * Manage submission tags with add/delete functionality
 */

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { AddTagForm } from './AddTagForm';
import type { CfpAdminTag } from '@/lib/types/cfp-admin';

interface TagsTabProps {
  tags: CfpAdminTag[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  onMerge: (sourceTagIds: string[], targetName: string) => Promise<void>;
  isMerging: boolean;
}

export function TagsTab({
  tags,
  isLoading,
  onDelete,
  isDeleting,
  onMerge,
  isMerging,
}: TagsTabProps) {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [targetName, setTargetName] = useState('');
  const [error, setError] = useState('');

  const selectedTags = useMemo(
    () => tags.filter((tag) => selectedTagIds.includes(tag.id)),
    [selectedTagIds, tags]
  );

  const toggleSelection = (tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId]
    );
    setError('');
  };

  const handleMerge = async () => {
    if (selectedTagIds.length < 2) {
      setError('Select at least two tags to merge.');
      return;
    }

    if (!targetName.trim()) {
      setError('Enter the new merged tag name.');
      return;
    }

    try {
      await onMerge(selectedTagIds, targetName);
      setSelectedTagIds([]);
      setTargetName('');
      setError('');
    } catch (mergeError) {
      setError(mergeError instanceof Error ? mergeError.message : 'Failed to merge tags');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <AddTagForm />
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-black mb-1">Merged Tag Name</label>
            <input
              type="text"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              placeholder="canonical tag name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F1E271]"
            />
          </div>
          <div className="text-sm text-gray-700">
            {selectedTagIds.length} tag{selectedTagIds.length === 1 ? '' : 's'} selected
          </div>
          <button
            type="button"
            onClick={handleMerge}
            disabled={isMerging || selectedTagIds.length < 2}
            className="px-4 py-2 rounded-lg bg-black text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isMerging ? 'Merging...' : 'Merge Selected Tags'}
          </button>
        </div>

        {selectedTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleSelection(tag.id)}
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm text-black"
              >
                <span>{tag.name}</span>
                <span className="text-xs text-gray-500">{tag.submission_count} submissions</span>
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}

        <p className="mt-3 text-sm text-gray-600">
          Select tag entries below, then merge them into a single tag name. Submission links will be rewired to the merged tag.
        </p>
        {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div key={tag.id} className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleSelection(tag.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selectedTagIds.includes(tag.id)
                    ? 'border-black bg-black text-white'
                    : tag.is_suggested
                      ? 'border-transparent bg-[#F1E271] text-black'
                      : 'border-transparent bg-gray-100 text-black'
                }`}
              >
                {tag.name}
                <span className={`text-xs ${selectedTagIds.includes(tag.id) ? 'text-white/80' : 'opacity-75'}`}>
                  {tag.submission_count} submissions
                </span>
                {tag.is_suggested && <span className="text-xs opacity-75">suggested</span>}
              </button>
              <button
                type="button"
                onClick={() => onDelete(tag.id)}
                disabled={isDeleting}
                className="w-7 h-7 rounded-full bg-black/10 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                title="Delete tag"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {tags.length === 0 && <p className="text-black">No tags found</p>}
        </div>
      )}
    </div>
  );
}
