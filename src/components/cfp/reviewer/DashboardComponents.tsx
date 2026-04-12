/**
 * Dashboard Components
 * Reusable components for the reviewer dashboard
 */

import { PropsWithChildren, useMemo, useState } from 'react';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions, Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import Link from 'next/link';
import { Search, X, Filter, Check, Bookmark, ChevronDown } from 'lucide-react';
import { Heading, Select } from '@/components/atoms';
import {
  TYPE_LABELS,
  TYPE_OPTIONS,
  LEVEL_OPTIONS,
  STATUS_OPTIONS,
  SORT_OPTIONS,
  REVIEW_BASED_SORT_VALUES,
  ReviewFilterType,
} from './types';

type ReviewerPillTone = 'ghost' | 'dark' | 'yellow' | 'green' | 'red' | 'purple' | 'blue';

interface ReviewerPillProps extends PropsWithChildren {
  tone?: ReviewerPillTone;
  borderHighlight?: boolean;
  className?: string;
}

export function ReviewerPill({
  tone = 'dark',
  borderHighlight = false,
  className = '',
  children,
}: ReviewerPillProps) {
  const toneClasses: Record<ReviewerPillTone, string> = {
    ghost: 'bg-transparent text-brand-gray-light max-sm:px-0!',
    dark: 'bg-brand-black text-brand-gray-light',
    yellow: 'bg-brand-primary/20 text-brand-primary',
    green: 'bg-brand-green/20 text-brand-green',
    red: 'bg-brand-red/20 text-brand-red',
    purple: 'bg-purple-500/20 text-purple-300',
    blue: 'bg-brand-blue/20 text-brand-blue'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
        borderHighlight ? 'border-brand-yellow-main' : 'border-transparent'
      } ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

// Status Badge
export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    submitted: 'bg-brand-blue',
    under_review: 'bg-brand-orange',
    shortlisted: 'bg-purple-400',
    waitlisted: 'bg-brand-yellow-main',
    accepted: 'bg-brand-green',
    rejected: 'bg-brand-red',
  };

  const labels: Record<string, string> = {
    submitted: 'Submitted',
    under_review: 'In Review',
    shortlisted: 'Shortlisted',
    waitlisted: 'Waitlisted',
    accepted: 'Accepted',
    rejected: 'Rejected',
  };

  return (
    <ReviewerPill tone="ghost">
      <span className={`rounded-full size-1.5 block ${styles[status]}`} />
      {labels[status] || status}
    </ReviewerPill>
  );
}

// Stats Cards
interface StatsCardsProps {
  total: number;
  reviewed: number;
  pending: number;
}

export function StatsCards({ total, reviewed, pending }: StatsCardsProps) {
  const percentage = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  return (
    <div className="space-y-4 mb-8">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-brand-gray-dark rounded-xl p-4 sm:p-6">
          <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{total}</div>
          <div className="text-brand-gray-light text-sm">Total Submissions</div>
        </div>
        <div className="bg-brand-gray-dark rounded-xl p-4 sm:p-6">
          <div className="text-2xl sm:text-3xl font-bold text-green-400 mb-1">{reviewed}</div>
          <div className="text-brand-gray-light text-sm">Reviewed by You</div>
        </div>
        <div className="bg-brand-gray-dark rounded-xl p-4 sm:p-6">
          <div className="text-2xl sm:text-3xl font-bold text-brand-primary mb-1">{pending}</div>
          <div className="text-brand-gray-light text-sm">Pending Review</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-brand-gray-dark rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs sm:text-sm text-brand-gray-light">Your Progress</span>
          <span className="text-xs sm:text-sm font-medium text-white">
            {reviewed} of {total} reviewed ({percentage}%)
          </span>
        </div>
        <div className="h-3 bg-brand-gray-darkest rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Filter Bar
interface FilterBarProps {
  searchQuery: string;
  reviewFilter: ReviewFilterType;
  typeFilter: string;
  levelFilter: string;
  statusFilters: string[];
  coverageMinFilter: number;
  tagFilters: string[];
  availableTags: string[];
  sortBy: string;
  showFilters: boolean;
  hasActiveFilters: boolean;
  isAnonymous?: boolean;
  onSearchChange: (query: string) => void;
  onReviewFilterChange: (filter: ReviewFilterType) => void;
  onTypeFilterChange: (type: string) => void;
  onLevelFilterChange: (level: string) => void;
  onStatusFiltersChange: (statuses: string[]) => void;
  onCoverageMinFilterChange: (value: number | null) => void;
  onTagFiltersChange: (tags: string[]) => void;
  onSortChange: (sort: string) => void;
  onToggleFilters: () => void;
  onClearFilters: () => void;
}

interface TagMultiSelectProps {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
}

function TagMultiSelect({ label, options, value, onChange }: TagMultiSelectProps) {
  const [query, setQuery] = useState('');

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => option.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  return (
    <div>
      <label className="block text-xs font-medium mb-1.5 text-brand-gray-light">
        {label}
      </label>
      <Combobox
        value={value}
        onChange={(nextValue: string[]) => {
          onChange(nextValue);
          setQuery('');
        }}
        multiple
      >
        <div className="relative">
          <div className="flex w-full flex-wrap items-center gap-2 rounded-lg bg-brand-gray-darkest px-3 py-1.5 pr-10 text-sm text-white focus-within:ring-2 focus-within:ring-brand-primary">
            {!!value.length && (<span className="bg-brand-yellow-main text-black grid place-items-center leading-none text-xs rounded-full size-4">{value.length}</span>)}

            <ComboboxInput
              className="min-w-[120px] flex-1 bg-transparent text-sm text-white placeholder:text-white !outline-0"
              displayValue={() => ''}
              onChange={(event) => setQuery(event.target.value)}
              onBlur={() => setQuery('')}
              placeholder={value.length > 0 ? 'Add another...' : 'Search or select tags...'}
              aria-label="Filter by tags"
            />
          </div>

          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-3 text-brand-gray-medium">
            <ChevronDown className="h-4 w-4" />
          </ComboboxButton>

          <ComboboxOptions className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-lg border border-brand-gray-medium bg-brand-gray-dark py-1 shadow-lg focus:outline-none hover">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-brand-gray-medium">
                No matching tags
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option);

                return (
                  <ComboboxOption
                    key={option}
                    value={option}
                    className="group flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm text-brand-gray-light transition-colors data-[focus]:bg-brand-gray-medium data-[focus]:text-white"
                  >
                    <span className={isSelected ? 'font-medium text-white' : ''}>{option}</span>
                    {isSelected && <Check className="h-4 w-4 text-brand-primary" />}
                  </ComboboxOption>
                );
              })
            )}
          </ComboboxOptions>
        </div>
      </Combobox>
    </div>
  );
}

function StatusMultiSelectFilterPopover({ selected, isAnonymous, onChange }: { selected: string[]; isAnonymous: boolean; onChange: (value: string[]) => void }) {
  const options = STATUS_OPTIONS.filter((option) => (
    option.value && (!isAnonymous || !['accepted', 'waitlisted'].includes(option.value))
  ));
  const toggleValue = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }

    onChange([...selected, value]);
  };

  return (
    <div>
      <label className="block text-xs font-medium mb-1.5 text-brand-gray-light">Status</label>
      <Popover className="relative">
        <PopoverButton className="flex w-full items-center justify-between gap-2 rounded-lg bg-brand-gray-darkest px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer">
          <span>{selected.length > 0 ? 'Status' : 'All Statuses'}</span>
          <span className="inline-flex items-center gap-2">
            {selected.length > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-yellow-main px-1 text-xs font-semibold text-black">{selected.length}</span>}
            <ChevronDown className="h-4 w-4 text-brand-gray-medium" />
          </span>
        </PopoverButton>
        <PopoverPanel anchor="bottom end" className="z-50 mt-2 w-64 rounded-lg border border-brand-gray-medium bg-brand-gray-dark p-2 shadow-lg">
          <div className="max-h-64 overflow-auto space-y-1">
            {options.map((option) => {
              const checked = selected.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleValue(option.value)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-brand-gray-light hover:bg-brand-gray-medium hover:text-white cursor-pointer"
                >
                  <span>{option.label}</span>
                  {checked ? <Check className="w-4 h-4 text-brand-primary" /> : <span className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
        </PopoverPanel>
      </Popover>
    </div>
  );
}

export function FilterBar({
  searchQuery,
  reviewFilter,
  typeFilter,
  levelFilter,
  statusFilters,
  coverageMinFilter,
  tagFilters,
  availableTags,
  sortBy,
  showFilters,
  hasActiveFilters,
  isAnonymous = false,
  onSearchChange,
  onReviewFilterChange,
  onTypeFilterChange,
  onLevelFilterChange,
  onStatusFiltersChange,
  onCoverageMinFilterChange,
  onTagFiltersChange,
  onSortChange,
  onToggleFilters,
  onClearFilters,
}: FilterBarProps) {
  // Filter out review-based sort options for anonymous reviewers
  const availableSortOptions = isAnonymous
    ? SORT_OPTIONS.filter(opt => !REVIEW_BASED_SORT_VALUES.includes(opt.value))
    : SORT_OPTIONS;
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
              placeholder='Search submissions (e.g. react -"ai" "event sourcing")...'
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
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'reviewed', 'bookmarked'] as const).map((f) => (
            <button
              key={f}
              onClick={() => onReviewFilterChange(reviewFilter === f ? 'all' : f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                reviewFilter === f
                  ? 'bg-brand-primary text-black'
                  : 'bg-brand-gray-darkest text-brand-gray-light hover:text-white'
              }`}
            >
              {f === 'bookmarked' && <Bookmark className="w-3.5 h-3.5" />}
              {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : f === 'reviewed' ? 'Reviewed' : 'Bookmarked'}
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
          <div className="grid sm:grid-cols-2 xl:grid-cols-6 gap-4">
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
            <StatusMultiSelectFilterPopover
              selected={statusFilters}
              isAnonymous={isAnonymous}
              onChange={onStatusFiltersChange}
            />
            <div>
              <label htmlFor="coverage-min-filter" className="block text-xs font-medium mb-1.5 text-brand-gray-light">
                Coverage At Least
              </label>
              <div className="relative">
                <input
                  id="coverage-min-filter"
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={coverageMinFilter > 0 ? coverageMinFilter : ''}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    onCoverageMinFilterChange(nextValue === '' ? null : Number(nextValue));
                  }}
                  placeholder="Any %"
                  className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-gray-medium">
                  %
                </span>
              </div>
            </div>
            <TagMultiSelect
              label="Tags"
              value={tagFilters}
              onChange={onTagFiltersChange}
              options={availableTags}
            />
            <Select
              label="Sort By"
              value={sortBy}
              onChange={onSortChange}
              options={availableSortOptions}
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
  stats: { review_count: number; avg_overall?: number | null; coverage_percent?: number };
}

interface SubmissionCardProps {
  submission: SubmissionCardSubmission;
  isAnonymous?: boolean;
  activeTagFilters?: string[];
  /** Current dashboard search params to preserve when returning */
  dashboardParams?: string;
}

export function SubmissionCard({
  submission,
  isAnonymous = false,
  activeTagFilters = [],
  dashboardParams,
}: SubmissionCardProps) {
  const href = dashboardParams
    ? `/cfp/reviewer/submissions/${submission.id}?returnTo=${encodeURIComponent(dashboardParams)}`
    : `/cfp/reviewer/submissions/${submission.id}`;
  const hasActiveTagFilters = activeTagFilters.length > 0;
  const displayTags = useMemo(() => {
    const tags = submission.tags || [];

    if (!hasActiveTagFilters) {
      return tags.slice(0, 5);
    }

    return [...tags]
      .sort((a, b) => {
        const aIsActive = activeTagFilters.includes(a.name);
        const bIsActive = activeTagFilters.includes(b.name);

        if (aIsActive === bIsActive) return 0;
        return aIsActive ? -1 : 1;
      })
      .slice(0, 5);
  }, [submission.tags, hasActiveTagFilters, activeTagFilters]);

  const coverageLabel =
    (submission.stats.coverage_percent || 0) < 25
      ? 'Low coverage'
      : (submission.stats.coverage_percent || 0) < 60
        ? 'Some coverage'
        : 'Well covered';

  return (
    <Link
      href={href}
      className={`block bg-brand-gray-dark rounded-xl p-4 sm:p-6 hover:bg-brand-gray-dark/70 border-2 border-transparent hover:border-brand-gray-medium transition-all duration-300`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <StatusBadge status={submission.status} />
            <ReviewerPill tone="ghost">
              {TYPE_LABELS[submission.submission_type]}
            </ReviewerPill>
            <ReviewerPill tone="ghost" className="capitalize">
              {submission.talk_level}
            </ReviewerPill>
          </div>
          <h3 className="text-md sm:text-lg font-semibold text-white mb-2 line-clamp-2">
            {submission.title}
          </h3>
          <p className="text-brand-gray-light text-sm line-clamp-2 mb-3">
            {submission.abstract}
          </p>
          {submission.tags && submission.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {displayTags.map((tag) => (
                <ReviewerPill
                  key={tag.id}
                  tone="dark"
                  borderHighlight={hasActiveTagFilters && activeTagFilters.includes(tag.name)}
                >
                  {tag.name}
                </ReviewerPill>
              ))}
              {submission.tags.length > 5 && (
                <ReviewerPill tone="ghost" className="text-brand-gray-medium">
                  +{submission.tags.length - 5} more
                </ReviewerPill>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 sm:text-right">
            <div className="flex flex-wrap sm:flex-col gap-1.5 items-center">
                <ReviewerPill tone={submission.my_review ? 'green' : 'yellow'}>
                  {submission.my_review ? 'Reviewed' : 'Needs Review'}
                </ReviewerPill>
                <ReviewerPill tone="ghost">
                  {coverageLabel}
                </ReviewerPill>
                {!isAnonymous && (
                  <div className="text-sm text-brand-gray-light">
                    Score: {submission.my_review?.score_overall || 0}/4
                  </div>
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

// Re-export Pagination from atoms for backwards compatibility
export { Pagination } from '@/components/atoms';
