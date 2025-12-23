/**
 * Dashboard Components
 * Reusable components for the reviewer dashboard
 */

import Link from 'next/link';
import { Search, X, Filter, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Heading, Select } from '@/components/atoms';
import {
  TYPE_LABELS,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  LEVEL_OPTIONS,
  SORT_OPTIONS,
  PAGE_SIZE_OPTIONS,
  ReviewFilterType,
} from './types';

// Status Badge
export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    submitted: 'bg-blue-500/20 text-blue-300',
    under_review: 'bg-purple-500/20 text-purple-300',
    waitlisted: 'bg-orange-500/20 text-orange-300',
    accepted: 'bg-green-500/20 text-green-300',
    rejected: 'bg-red-500/20 text-red-300',
  };

  const labels: Record<string, string> = {
    submitted: 'Submitted',
    under_review: 'In Review',
    waitlisted: 'Waitlisted',
    accepted: 'Accepted',
    rejected: 'Rejected',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${styles[status] || 'bg-gray-500/20 text-gray-300'}`}>
      {labels[status] || status}
    </span>
  );
}

// Stats Cards
interface StatsCardsProps {
  total: number;
  reviewed: number;
  pending: number;
}

export function StatsCards({ total, reviewed, pending }: StatsCardsProps) {
  return (
    <div className="grid sm:grid-cols-3 gap-4 mb-8">
      <div className="bg-brand-gray-dark rounded-xl p-6">
        <div className="text-3xl font-bold text-white mb-1">{total}</div>
        <div className="text-brand-gray-light text-sm">Total Submissions</div>
      </div>
      <div className="bg-brand-gray-dark rounded-xl p-6">
        <div className="text-3xl font-bold text-green-400 mb-1">{reviewed}</div>
        <div className="text-brand-gray-light text-sm">Reviewed by You</div>
      </div>
      <div className="bg-brand-gray-dark rounded-xl p-6">
        <div className="text-3xl font-bold text-brand-primary mb-1">{pending}</div>
        <div className="text-brand-gray-light text-sm">Pending Review</div>
      </div>
    </div>
  );
}

// Filter Bar
interface FilterBarProps {
  searchQuery: string;
  reviewFilter: ReviewFilterType;
  statusFilter: string;
  typeFilter: string;
  levelFilter: string;
  sortBy: string;
  showFilters: boolean;
  hasActiveFilters: boolean;
  onSearchChange: (query: string) => void;
  onReviewFilterChange: (filter: ReviewFilterType) => void;
  onStatusFilterChange: (status: string) => void;
  onTypeFilterChange: (type: string) => void;
  onLevelFilterChange: (level: string) => void;
  onSortChange: (sort: string) => void;
  onToggleFilters: () => void;
  onClearFilters: () => void;
}

export function FilterBar({
  searchQuery,
  reviewFilter,
  statusFilter,
  typeFilter,
  levelFilter,
  sortBy,
  showFilters,
  hasActiveFilters,
  onSearchChange,
  onReviewFilterChange,
  onStatusFilterChange,
  onTypeFilterChange,
  onLevelFilterChange,
  onSortChange,
  onToggleFilters,
  onClearFilters,
}: FilterBarProps) {
  return (
    <div className="bg-brand-gray-dark rounded-xl p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gray-medium" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by title, abstract, or tags..."
              className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray-medium hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Review Filter */}
        <div className="flex gap-2">
          {(['all', 'pending', 'reviewed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => onReviewFilterChange(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                reviewFilter === f
                  ? 'bg-brand-primary text-black'
                  : 'bg-brand-gray-darkest text-brand-gray-light hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Reviewed'}
            </button>
          ))}
        </div>

        {/* Toggle Advanced Filters */}
        <button
          onClick={onToggleFilters}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer inline-flex items-center gap-2 ${
            showFilters || hasActiveFilters
              ? 'bg-brand-primary/20 text-brand-primary'
              : 'bg-brand-gray-darkest text-brand-gray-light hover:text-white'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-brand-primary" />}
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-brand-gray-medium">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="Status"
              value={statusFilter}
              onChange={onStatusFilterChange}
              options={STATUS_OPTIONS}
              variant="dark"
              size="sm"
            />
            <Select
              label="Type"
              value={typeFilter}
              onChange={onTypeFilterChange}
              options={TYPE_OPTIONS}
              variant="dark"
              size="sm"
            />
            <Select
              label="Level"
              value={levelFilter}
              onChange={onLevelFilterChange}
              options={LEVEL_OPTIONS}
              variant="dark"
              size="sm"
            />
            <Select
              label="Sort By"
              value={sortBy}
              onChange={onSortChange}
              options={SORT_OPTIONS}
              variant="dark"
              size="sm"
            />
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={onClearFilters}
                className="text-sm text-brand-gray-light hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Submission Card
interface SubmissionCardSubmission {
  id: string;
  title: string;
  abstract: string;
  status: string;
  submission_type: string;
  talk_level: string;
  tags?: { id: string; name: string }[];
  my_review?: { score_overall: number | null } | null;
  stats: { review_count: number; avg_overall?: number | null };
}

export function SubmissionCard({ submission }: { submission: SubmissionCardSubmission }) {
  return (
    <Link
      href={`/cfp/reviewer/submissions/${submission.id}`}
      className="block bg-brand-gray-dark rounded-xl p-6 hover:bg-brand-gray-dark/70 border border-transparent hover:border-brand-gray-medium transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <StatusBadge status={submission.status} />
            <span className="text-brand-gray-medium text-sm">
              {TYPE_LABELS[submission.submission_type]}
            </span>
            <span className="text-brand-gray-medium text-sm capitalize">
              {submission.talk_level}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
            {submission.title}
          </h3>
          <p className="text-brand-gray-light text-sm line-clamp-2 mb-3">
            {submission.abstract}
          </p>
          {submission.tags && submission.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {submission.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 bg-brand-gray-darkest text-brand-gray-light rounded text-xs"
                >
                  {tag.name}
                </span>
              ))}
              {submission.tags.length > 5 && (
                <span className="px-2 py-0.5 text-brand-gray-medium text-xs">
                  +{submission.tags.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 sm:text-right">
          {submission.my_review ? (
            <div className="mb-2">
              <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium inline-flex items-center gap-1">
                <Check className="w-3 h-3" />
                Reviewed
              </span>
              <div className="text-sm text-brand-gray-light mt-1">
                Score: {submission.my_review.score_overall}/5
              </div>
            </div>
          ) : (
            <span className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-sm font-medium">
              Needs Review
            </span>
          )}

          <div className="text-sm text-brand-gray-medium mt-2">
            {submission.stats.review_count} review{submission.stats.review_count !== 1 ? 's' : ''}
            {submission.stats.avg_overall && (
              <span className="ml-2">
                Avg: {submission.stats.avg_overall.toFixed(1)}/5
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// Empty State
interface EmptyStateProps {
  reviewFilter: ReviewFilterType;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function EmptyState({ reviewFilter, hasActiveFilters, onClearFilters }: EmptyStateProps) {
  return (
    <div className="bg-brand-gray-dark rounded-2xl p-12 text-center">
      <div className="w-16 h-16 bg-brand-gray-medium rounded-full flex items-center justify-center mx-auto mb-4">
        <Check className="w-8 h-8 text-brand-gray-light" />
      </div>
      <Heading level="h2" className="text-lg font-bold text-white mb-2">
        {reviewFilter === 'pending' && !hasActiveFilters ? 'All Caught Up!' : 'No Submissions Found'}
      </Heading>
      <p className="text-brand-gray-light mb-4">
        {reviewFilter === 'pending' && !hasActiveFilters
          ? 'You have reviewed all available submissions.'
          : 'No submissions match your current filters.'}
      </p>
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="text-brand-primary hover:underline cursor-pointer"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

// Pagination
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = ((currentPage - 1) * pageSize) + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to show
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((page) => {
      if (page === 1 || page === totalPages) return true;
      if (Math.abs(page - currentPage) <= 1) return true;
      return false;
    })
    .reduce<(number | 'ellipsis')[]>((acc, page, idx, arr) => {
      if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
        acc.push('ellipsis');
      }
      acc.push(page);
      return acc;
    }, []);

  const pageSizeOptions = PAGE_SIZE_OPTIONS.map((size) => ({
    value: String(size),
    label: String(size),
  }));

  return (
    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="text-sm text-brand-gray-light">
          Showing {startItem} - {endItem} of {totalItems}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-brand-gray-light">Show:</span>
          <Select
            value={String(pageSize)}
            onChange={(value) => onPageSizeChange(Number(value))}
            options={pageSizeOptions}
            variant="dark"
            size="sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg bg-brand-gray-dark text-brand-gray-light hover:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-lg bg-brand-gray-dark text-brand-gray-light hover:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1">
          {pages.map((item, idx) =>
            item === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-brand-gray-medium">...</span>
            ) : (
              <button
                key={item}
                onClick={() => onPageChange(item)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  currentPage === item
                    ? 'bg-brand-primary text-black'
                    : 'bg-brand-gray-dark text-brand-gray-light hover:text-white'
                }`}
              >
                {item}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg bg-brand-gray-dark text-brand-gray-light hover:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg bg-brand-gray-dark text-brand-gray-light hover:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
