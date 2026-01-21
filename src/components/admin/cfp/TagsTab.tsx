/**
 * CFP Tags Tab Component
 * Manage submission tags with add/delete functionality
 */

import { X } from 'lucide-react';
import { AddTagForm } from './AddTagForm';
import type { CfpAdminTag } from '@/lib/types/cfp-admin';

interface TagsTabProps {
  tags: CfpAdminTag[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function TagsTab({ tags, isLoading, onDelete, isDeleting }: TagsTabProps) {
  return (
    <div>
      <div className="mb-6">
        <AddTagForm />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                tag.is_suggested ? 'bg-[#F1E271] text-black' : 'bg-gray-100 text-black'
              }`}
            >
              {tag.name}
              {tag.is_suggested && <span className="text-xs opacity-75">suggested</span>}
              <button
                onClick={() => onDelete(tag.id)}
                disabled={isDeleting}
                className="ml-1 w-4 h-4 rounded-full bg-black/10 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                title="Delete tag"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {tags.length === 0 && <p className="text-black">No tags found</p>}
        </div>
      )}
    </div>
  );
}
