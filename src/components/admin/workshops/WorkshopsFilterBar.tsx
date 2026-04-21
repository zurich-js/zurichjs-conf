/**
 * Filter bar for the workshops admin list.
 * Status chip buttons + free-text search (matches title or speaker name).
 */

import { Search } from 'lucide-react';

export type WorkshopFilterStatus =
  | 'all'
  | 'not_configured'
  | 'draft'
  | 'published'
  | 'archived';

interface WorkshopsFilterBarProps {
  status: WorkshopFilterStatus;
  onStatusChange: (status: WorkshopFilterStatus) => void;
  search: string;
  onSearchChange: (value: string) => void;
  counts: Record<WorkshopFilterStatus, number>;
}

const FILTERS: Array<{ key: WorkshopFilterStatus; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'not_configured', label: 'Not configured' },
  { key: 'draft', label: 'Draft' },
  { key: 'published', label: 'Published' },
  { key: 'archived', label: 'Archived' },
];

export function WorkshopsFilterBar({
  status,
  onStatusChange,
  search,
  onSearchChange,
  counts,
}: WorkshopsFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = status === filter.key;
          const count = counts[filter.key] ?? 0;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => onStatusChange(filter.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                active
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {filter.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                  active ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative w-full sm:w-64">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search title or speaker…"
          className="w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-gray-400"
        />
      </div>
    </div>
  );
}
