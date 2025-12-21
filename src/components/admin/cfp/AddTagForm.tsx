/**
 * Add Tag Form Component
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cfpQueryKeys } from '@/lib/types/cfp-admin';

export function AddTagForm() {
  const [name, setName] = useState('');
  const [isSuggested, setIsSuggested] = useState(true);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const addTagMutation = useMutation({
    mutationFn: async (data: { name: string; is_suggested: boolean }) => {
      const res = await fetch('/api/admin/cfp/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create');
      }
      return res.json();
    },
    onSuccess: () => {
      setName('');
      setError('');
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.tags });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    addTagMutation.mutate({ name, is_suggested: isSuggested });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
      <div>
        <label className="block text-sm font-medium text-black mb-1">Tag Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New Tag"
          required
          className="px-3 py-2 rounded-lg border border-gray-300 text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
        />
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isSuggested}
          onChange={(e) => setIsSuggested(e.target.checked)}
          className="rounded border-gray-300"
        />
        <span className="text-sm text-black font-medium">Suggested Tag</span>
      </label>
      <button
        type="submit"
        disabled={addTagMutation.isPending}
        className="px-4 py-2 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        {addTagMutation.isPending ? 'Adding...' : 'Add Tag'}
      </button>
      {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
    </form>
  );
}
