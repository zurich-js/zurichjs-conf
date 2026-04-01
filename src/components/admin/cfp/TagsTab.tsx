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
  onDelete: (tag: CfpAdminTag) => void;
  isDeleting: boolean;
  onMerge: (sourceTagIds: string[], targetName: string, isSuggested: boolean) => Promise<void>;
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
  const [isSuggested, setIsSuggested] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'usage' | 'name'>('usage');

  const selectedTags = useMemo(
    () => tags.filter((tag) => selectedTagIds.includes(tag.id)),
    [selectedTagIds, tags]
  );

  const sortedTags = useMemo(() => {
    return [...tags].sort((left, right) => {
      if (sortBy === 'usage') {
        if (right.submission_count !== left.submission_count) {
          return right.submission_count - left.submission_count;
        }

        return left.name.localeCompare(right.name);
      }

      return left.name.localeCompare(right.name);
    });
  }, [sortBy, tags]);

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
      await onMerge(selectedTagIds, targetName, isSuggested);
      setSelectedTagIds([]);
      setTargetName('');
      setIsSuggested(false);
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
          <label className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium text-black">
            <input
              type="checkbox"
              checked={isSuggested}
              onChange={(event) => setIsSuggested(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span>Suggested Tag</span>
          </label>
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
              <label
                key={tag.id}
                className="inline-flex cursor-pointer items-center gap-3 rounded-full border border-black/10 bg-white px-3 py-2 text-sm text-black"
              >
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => toggleSelection(tag.id)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-100 px-2 text-xs font-medium text-gray-700">
                  {tag.submission_count}
                </span>
                <span>{tag.name}</span>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/5 text-black">
                  <X className="h-3 w-3" />
                </span>
              </label>
            ))}
          </div>
        )}

        <p className="mt-3 text-sm text-gray-600">
          Select tag entries below, then merge them into a single tag name. Submission links will be rewired to the merged tag.
        </p>
        {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-gray-700">
        <div className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#F1E271]" />
          <span>Suggested tags</span>
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-gray-300" />
          <span>Manually added tags</span>
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 px-1.5 text-[11px] font-semibold text-gray-700">
            0
          </span>
          <span>Number of submissions currently using that tag</span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-black">Sort tags:</span>
        <button
          type="button"
          onClick={() => setSortBy('usage')}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            sortBy === 'usage'
              ? 'bg-black text-white'
              : 'bg-gray-100 text-black hover:bg-gray-200'
          }`}
        >
          Usage (High-Low)
        </button>
        <button
          type="button"
          onClick={() => setSortBy('name')}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            sortBy === 'name'
              ? 'bg-black text-white'
              : 'bg-gray-100 text-black hover:bg-gray-200'
          }`}
        >
          Name (A-Z)
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {sortedTags.map((tag) => (
            <label
              key={tag.id}
              className={`inline-flex cursor-pointer items-center gap-3 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                selectedTagIds.includes(tag.id)
                  ? 'border-black bg-black text-white'
                  : tag.is_suggested
                    ? 'border-transparent bg-[#F1E271] text-black'
                    : 'border-transparent bg-gray-100 text-black'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedTagIds.includes(tag.id)}
                onChange={() => toggleSelection(tag.id)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span
                className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-medium ${
                  selectedTagIds.includes(tag.id)
                    ? 'bg-white/15 text-white'
                    : 'bg-black/10 text-black/75'
                }`}
              >
                {tag.submission_count}
              </span>
              <span>{tag.name}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onDelete(tag);
                }}
                disabled={isDeleting}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                  selectedTagIds.includes(tag.id)
                    ? 'bg-white/15 text-white hover:bg-red-500'
                    : 'bg-black/10 text-black hover:bg-red-500 hover:text-white'
                }`}
                title="Delete tag"
              >
                <X className="h-3 w-3" />
              </button>
            </label>
          ))}
          {tags.length === 0 && <p className="text-black">No tags found</p>}
        </div>
      )}
    </div>
  );
}
