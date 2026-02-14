/**
 * Submissions Tab Helper Components
 * Reusable components for the submissions table/list view
 */

import { X, Filter } from 'lucide-react';
import type { CfpAdminSubmission } from '@/lib/types/cfp-admin';

// Score color coding helper
export function getScoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400';
  if (score >= 3.5) return 'text-green-600';
  if (score >= 2.5) return 'text-amber-600';
  if (score >= 1.5) return 'text-orange-600';
  return 'text-red-600';
}

export function getScoreBgColor(score: number | null): string {
  if (score === null) return 'bg-gray-100';
  if (score >= 3.5) return 'bg-green-50';
  if (score >= 2.5) return 'bg-amber-50';
  if (score >= 1.5) return 'bg-orange-50';
  return 'bg-red-50';
}

// Coverage progress bar component
export function CoverageBar({ percent, reviewCount, totalReviewers }: { percent: number; reviewCount: number; totalReviewers: number }) {
  const getBarColor = () => {
    if (percent >= 75) return 'bg-green-500';
    if (percent >= 50) return 'bg-amber-500';
    if (percent >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden min-w-[60px]">
        <div
          className={`h-full ${getBarColor()} transition-all`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 whitespace-nowrap">
        {reviewCount}/{totalReviewers}
      </span>
    </div>
  );
}

// Filter chip component
export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F1E271] text-black text-xs font-medium rounded-full">
      {label}
      <button
        onClick={onRemove}
        className="hover:bg-black/10 rounded-full p-0.5 cursor-pointer"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// Active filters bar with summary
interface ActiveFiltersBarProps {
  submissions: CfpAdminSubmission[];
  filteredSubmissions: CfpAdminSubmission[];
  searchQuery: string;
  statusFilter: string;
  typeFilter: string;
  minReviews: string;
  shortlistOnly: boolean;
  onClearSearch: () => void;
  onClearStatus: () => void;
  onClearType: () => void;
  onClearMinReviews: () => void;
  onClearShortlist: () => void;
  onClearAll: () => void;
}

export function ActiveFiltersBar({
  submissions,
  filteredSubmissions,
  searchQuery,
  statusFilter,
  typeFilter,
  minReviews,
  shortlistOnly,
  onClearSearch,
  onClearStatus,
  onClearType,
  onClearMinReviews,
  onClearShortlist,
  onClearAll,
}: ActiveFiltersBarProps) {
  const activeFilters: Array<{ label: string; onRemove: () => void }> = [];

  if (searchQuery.trim()) {
    activeFilters.push({ label: `Search: "${searchQuery}"`, onRemove: onClearSearch });
  }
  if (statusFilter !== 'all') {
    activeFilters.push({ label: `Status: ${statusFilter.replace('_', ' ')}`, onRemove: onClearStatus });
  }
  if (typeFilter !== 'all') {
    activeFilters.push({ label: `Type: ${typeFilter}`, onRemove: onClearType });
  }
  if (minReviews !== '0') {
    activeFilters.push({ label: `Min ${minReviews} reviews`, onRemove: onClearMinReviews });
  }
  if (shortlistOnly) {
    activeFilters.push({ label: 'Likely shortlisted', onRemove: onClearShortlist });
  }

  const hasFilters = activeFilters.length > 0;
  const isFiltered = filteredSubmissions.length !== submissions.length;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 px-4 bg-gray-50 rounded-lg border border-gray-200">
      {/* Summary */}
      <div className="flex items-center gap-2 text-sm">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-gray-700">
          Showing{' '}
          <span className="font-semibold text-black">{filteredSubmissions.length}</span>
          {isFiltered && (
            <>
              {' '}of{' '}
              <span className="font-semibold text-black">{submissions.length}</span>
            </>
          )}
          {' '}submission{filteredSubmissions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((filter, index) => (
            <FilterChip key={index} label={filter.label} onRemove={filter.onRemove} />
          ))}
          {activeFilters.length > 1 && (
            <button
              onClick={onClearAll}
              className="text-xs font-medium text-gray-600 hover:text-black underline cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
