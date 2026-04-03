/**
 * CFP Submissions Tab Component
 * Table/card view for managing CFP submissions with server-side pagination
 */

import { useMutation } from '@tanstack/react-query';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Check, ChevronDown, Filter } from 'lucide-react';
import { BusyArea, Pagination } from '@/components/atoms';
import { StatusBadge } from './StatusBadge';
import { ShortlistBadge } from './ShortlistBadge';
import { SpeakerAvatar } from './SpeakerAvatar';
import {
  getScoreColor,
  getScoreBgColor,
  CoverageBar,
} from './SubmissionsTabHelpers';
import type { CfpAdminSubmission } from '@/lib/types/cfp-admin';
import { formatScore } from '@/lib/cfp/scoring';
import { cycleMultiSort, getMultiSortDirection, SortIndicator, type MultiSort } from './tableSort';

export type SubmissionSortKey = 'title' | 'speaker' | 'reviews' | 'score' | 'coverage' | 'shortlist';

const STATUS_OPTIONS = [
  'draft',
  'submitted',
  'under_review',
  'shortlisted',
  'accepted',
  'rejected',
  'waitlisted',
  'withdrawn',
] as const;

const TYPE_OPTIONS = ['talk', 'workshop', 'lightning'] as const;
const SHORTLIST_OPTIONS = ['likely_shortlisted', 'maybe_shortlisted', 'unlikely_shortlisted'] as const;

interface SubmissionsTabProps {
  submissions: CfpAdminSubmission[];
  total: number;
  totalUnfiltered: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  statuses: string[];
  setStatuses: (v: string[]) => void;
  submissionTypes: string[];
  setSubmissionTypes: (v: string[]) => void;
  shortlistStatuses: string[];
  setShortlistStatuses: (v: string[]) => void;
  coverageMin: string;
  setCoverageMin: (v: string) => void;
  coverageMax: string;
  setCoverageMax: (v: string) => void;
  sort: MultiSort<SubmissionSortKey>;
  setSort: (v: MultiSort<SubmissionSortKey>) => void;
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  toggleSelectAll: () => void;
  bulkActionStatus: string;
  setBulkActionStatus: (v: string) => void;
  bulkUpdateStatusMutation: ReturnType<typeof useMutation<void, Error, { ids: string[]; status: string }>>;
  onSelectSubmission: (s: CfpAdminSubmission) => void;
}

function MultiSelectFilterPopover({
  label,
  options,
  selected,
  onChange,
  formatOption = (value: string) => value,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (value: string[]) => void;
  formatOption?: (value: string) => string;
}) {
  const toggleValue = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }
    onChange([...selected, value]);
  };

  return (
    <Popover className="relative">
      <PopoverButton className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black hover:bg-gray-50 cursor-pointer">
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F1E271] px-1 text-xs font-semibold text-black">
            {selected.length}
          </span>
        )}
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </PopoverButton>
      <PopoverPanel
        anchor="bottom end"
        className="z-40 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
      >
        <div className="max-h-64 overflow-auto space-y-1">
          {options.map((option) => {
            const checked = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleValue(option)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-black hover:bg-gray-100 cursor-pointer"
              >
                <span>{formatOption(option)}</span>
                {checked ? <Check className="w-4 h-4 text-black" /> : <span className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      </PopoverPanel>
    </Popover>
  );
}

export function SubmissionsTab({
  submissions,
  total,
  totalUnfiltered,
  currentPage,
  onPageChange,
  pageSize,
  isLoading,
  searchQuery,
  setSearchQuery,
  statuses,
  setStatuses,
  submissionTypes,
  setSubmissionTypes,
  shortlistStatuses,
  setShortlistStatuses,
  coverageMin,
  setCoverageMin,
  coverageMax,
  setCoverageMax,
  sort,
  setSort,
  selectedIds,
  toggleSelection,
  toggleSelectAll,
  bulkActionStatus,
  setBulkActionStatus,
  bulkUpdateStatusMutation,
  onSelectSubmission,
}: SubmissionsTabProps) {
  const totalPages = Math.ceil(total / pageSize);

  const handleSortClick = (key: SubmissionSortKey) => {
    setSort(cycleMultiSort(sort, key));
  };

  return (
    <div>
      <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Filter className="w-4 h-4 text-gray-500" />
              <span>
                Showing <span className="font-semibold text-black">{total}</span>
                {total !== totalUnfiltered && (
                  <>
                    {' '}of <span className="font-semibold text-black">{totalUnfiltered}</span>
                  </>
                )}{' '}
                submission{total !== 1 ? 's' : ''}
              </span>
            </div>
            {(searchQuery || statuses.length || submissionTypes.length || shortlistStatuses.length || coverageMin || coverageMax) ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatuses([]);
                  setSubmissionTypes([]);
                  setShortlistStatuses([]);
                  setCoverageMin('');
                  setCoverageMax('');
                }}
                className="mt-1 inline-flex w-fit text-xs text-gray-600 hover:text-black underline cursor-pointer"
              >
                Reset filters
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search topic content...'
              className="w-full lg:w-80 px-3 py-2 rounded-lg border border-gray-300 bg-white text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:outline-none text-sm"
            />

            <MultiSelectFilterPopover
              label="Status"
              options={STATUS_OPTIONS}
              selected={statuses}
              onChange={setStatuses}
              formatOption={(value) => value.replaceAll('_', ' ')}
            />
            <MultiSelectFilterPopover
              label="Type"
              options={TYPE_OPTIONS}
              selected={submissionTypes}
              onChange={setSubmissionTypes}
            />
            <MultiSelectFilterPopover
              label="Shortlist"
              options={SHORTLIST_OPTIONS}
              selected={shortlistStatuses}
              onChange={setShortlistStatuses}
              formatOption={(value) => value.replaceAll('_', ' ')}
            />

            <Popover className="relative">
              <PopoverButton className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black hover:bg-gray-50 cursor-pointer">
                <span>Coverage</span>
                {(coverageMin || coverageMax) && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F1E271] px-1 text-xs font-semibold text-black">
                    1
                  </span>
                )}
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </PopoverButton>
              <PopoverPanel
                anchor="bottom end"
                className="z-40 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
              >
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">Coverage %</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={coverageMin}
                      onChange={(e) => setCoverageMin(e.target.value)}
                      placeholder="Min"
                      className="w-20 px-2 py-1.5 rounded-md border border-gray-300 text-sm text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                    />
                    <span className="text-gray-500 text-sm">to</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={coverageMax}
                      onChange={(e) => setCoverageMax(e.target.value)}
                      placeholder="Max"
                      className="w-20 px-2 py-1.5 rounded-md border border-gray-300 text-sm text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                    />
                  </div>
                </div>
              </PopoverPanel>
            </Popover>

          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="mt-3 flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-2 w-fit">
            <span className="text-sm font-medium text-black">{selectedIds.size} selected</span>
            <div className="h-4 w-px bg-gray-300" />
            <select
              value={bulkActionStatus}
              onChange={(e) => setBulkActionStatus(e.target.value)}
              className="text-sm px-2 py-1 rounded border border-gray-300 text-black"
            >
              <option value="">Change status to...</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="accepted">Accepted</option>
              <option value="waitlisted">Waitlisted</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              onClick={() => {
                if (bulkActionStatus) {
                  bulkUpdateStatusMutation.mutate({ ids: Array.from(selectedIds), status: bulkActionStatus });
                }
              }}
              disabled={!bulkActionStatus || bulkUpdateStatusMutation.isPending}
              className="px-3 py-1 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-lg disabled:opacity-50 cursor-pointer"
            >
              {bulkUpdateStatusMutation.isPending ? 'Updating...' : 'Apply'}
            </button>
          </div>
        )}
      </div>

      <BusyArea busy={isLoading}>
        <>
          {/* Mobile Card View */}
          <MobileSubmissionsList
            submissions={submissions}
            selectedIds={selectedIds}
            toggleSelection={toggleSelection}
            toggleSelectAll={toggleSelectAll}
            onSelectSubmission={onSelectSubmission}
          />

          {/* Desktop Table View */}
          <DesktopSubmissionsTable
            submissions={submissions}
            selectedIds={selectedIds}
            toggleSelection={toggleSelection}
            toggleSelectAll={toggleSelectAll}
            onSelectSubmission={onSelectSubmission}
            sort={sort}
            onSortClick={handleSortClick}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={pageSize}
            totalItems={total}
            variant="light"
          />
        </>
      </BusyArea>
    </div>
  );
}

// Mobile card list component
function MobileSubmissionsList({
  submissions,
  selectedIds,
  toggleSelection,
  toggleSelectAll,
  onSelectSubmission,
}: {
  submissions: CfpAdminSubmission[];
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  toggleSelectAll: () => void;
  onSelectSubmission: (s: CfpAdminSubmission) => void;
}) {
  return (
    <div className="lg:hidden space-y-3">
      {submissions.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
          <input
            type="checkbox"
            checked={selectedIds.size === submissions.length && submissions.length > 0}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded border-gray-300 text-[#F1E271] cursor-pointer"
          />
          <span className="text-sm text-gray-600">Select all on page</span>
        </div>
      )}
      {submissions.map((s) => (
        <div
          key={s.id}
          className={`rounded-xl p-4 border border-gray-200 transition-all shadow-sm ${
            selectedIds.has(s.id) ? 'bg-yellow-50 border-yellow-300' : 'bg-white'
          }`}
        >
          <div className="flex items-start gap-3 mb-3">
            <input
              type="checkbox"
              checked={selectedIds.has(s.id)}
              onChange={() => toggleSelection(s.id)}
              className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#F1E271] cursor-pointer flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-black text-sm line-clamp-2 flex-1">{s.title}</h3>
                <StatusBadge status={s.status} />
              </div>
              <div className="flex items-center gap-2">
                <SpeakerAvatar speaker={s.speaker} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-black truncate">
                    {s.speaker?.first_name} {s.speaker?.last_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{s.speaker?.email}</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 line-clamp-2 mb-3 ml-7">{s.abstract}</p>

          <div className="flex flex-col gap-3 ml-7 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="px-2 py-1 bg-gray-100 rounded-full capitalize font-medium text-black">{s.submission_type}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{s.stats?.review_count || 0} reviews</span>
              <span className="text-gray-400">•</span>
              <span className={`px-2 py-0.5 rounded ${getScoreBgColor(s.stats?.avg_overall ?? null)} ${getScoreColor(s.stats?.avg_overall ?? null)} font-semibold`}>
                {formatScore(s.stats?.avg_overall ?? null)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Coverage:</span>
              <div className="flex-1 max-w-[120px]">
                <CoverageBar
                  percent={s.stats?.coverage_percent || 0}
                  reviewCount={s.stats?.review_count || 0}
                  totalReviewers={s.stats?.total_reviewers || 0}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              {s.stats?.shortlist_status && (
                <ShortlistBadge status={s.stats.shortlist_status} />
              )}
              <button
                onClick={() => onSelectSubmission(s)}
                className="px-4 py-2 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium text-xs rounded-lg cursor-pointer transition-colors flex-shrink-0 ml-auto"
              >
                Manage
              </button>
            </div>
          </div>
        </div>
      ))}
      {submissions.length === 0 && (
        <div className="text-center py-12 text-gray-500">No submissions found</div>
      )}
    </div>
  );
}

// Desktop table component
function DesktopSubmissionsTable({
  submissions,
  selectedIds,
  toggleSelection,
  toggleSelectAll,
  onSelectSubmission,
  sort,
  onSortClick,
}: {
  submissions: CfpAdminSubmission[];
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  toggleSelectAll: () => void;
  onSelectSubmission: (s: CfpAdminSubmission) => void;
  sort: MultiSort<SubmissionSortKey>;
  onSortClick: (key: SubmissionSortKey) => void;
}) {
  return (
    <div className="hidden lg:block overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 text-left text-sm text-black font-semibold">
          <tr>
            <th className="px-2 py-3 w-10">
              <input
                type="checkbox"
                checked={selectedIds.size === submissions.length && submissions.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-[#F1E271] cursor-pointer"
              />
            </th>
            <th className="px-2 py-3">
              <button
                type="button"
                onClick={() => onSortClick('title')}
                className="inline-flex items-center gap-1 cursor-pointer hover:text-black/80"
              >
                <span>Title</span>
                <SortIndicator direction={getMultiSortDirection(sort, 'title')} />
              </button>
            </th>
            <th className="px-2 py-3">
              <button
                type="button"
                onClick={() => onSortClick('speaker')}
                className="inline-flex items-center gap-1 cursor-pointer hover:text-black/80"
              >
                <span>Speaker</span>
                <SortIndicator direction={getMultiSortDirection(sort, 'speaker')} />
              </button>
            </th>
            <th className="px-2 py-3 w-20">Type</th>
            <th className="px-2 py-3 w-24">Status</th>
            <th className="px-2 py-3 w-20 text-center">
              <button
                type="button"
                onClick={() => onSortClick('reviews')}
                className="inline-flex items-center gap-1 cursor-pointer hover:text-black/80"
              >
                <span>Reviews</span>
                <SortIndicator direction={getMultiSortDirection(sort, 'reviews')} />
              </button>
            </th>
            <th className="px-2 py-3 w-16 text-center">
              <button
                type="button"
                onClick={() => onSortClick('score')}
                className="inline-flex items-center gap-1 cursor-pointer hover:text-black/80"
              >
                <span>Score</span>
                <SortIndicator direction={getMultiSortDirection(sort, 'score')} />
              </button>
            </th>
            <th className="px-2 py-3 w-20 text-center">
              <button
                type="button"
                onClick={() => onSortClick('coverage')}
                className="inline-flex items-center gap-1 cursor-pointer hover:text-black/80"
              >
                <span>Coverage</span>
                <SortIndicator direction={getMultiSortDirection(sort, 'coverage')} />
              </button>
            </th>
            <th className="px-2 py-3 w-32">
              <button
                type="button"
                onClick={() => onSortClick('shortlist')}
                className="inline-flex items-center gap-1 cursor-pointer hover:text-black/80"
              >
                <span>Shortlist</span>
                <SortIndicator direction={getMultiSortDirection(sort, 'shortlist')} />
              </button>
            </th>
            <th className="px-2 py-3 w-20">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {submissions.map((s) => (
            <tr key={s.id} className={`hover:bg-gray-50 ${selectedIds.has(s.id) ? 'bg-yellow-50' : ''}`}>
              <td className="px-2 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(s.id)}
                  onChange={() => toggleSelection(s.id)}
                  className="w-4 h-4 rounded border-gray-300 text-[#F1E271] cursor-pointer"
                />
              </td>
              <td className="px-2 py-3">
                <div className="font-medium text-black truncate max-w-xs" title={s.title}>{s.title}</div>
                <div className="text-xs text-gray-500 truncate max-w-xs" title={s.abstract}>{s.abstract}</div>
              </td>
              <td className="px-2 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <SpeakerAvatar speaker={s.speaker} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-black truncate" title={`${s.speaker?.first_name || ''} ${s.speaker?.last_name || ''}`}>
                      {s.speaker?.first_name} {s.speaker?.last_name}
                    </div>
                    <div className="text-xs text-gray-500 truncate" title={s.speaker?.email}>
                      {s.speaker?.email}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-2 py-3">
                <span className="inline-flex px-2 py-0.5 bg-gray-100 rounded-full text-xs text-black capitalize font-medium whitespace-nowrap">
                  {s.submission_type}
                </span>
              </td>
              <td className="px-2 py-3">
                <StatusBadge status={s.status} />
              </td>
              <td className="px-2 py-3 text-sm text-black font-medium text-center">{s.stats?.review_count || 0}</td>
              <td className="px-2 py-3">
                <div className="flex justify-center">
                  <span className={`inline-flex items-center justify-center w-10 h-7 rounded-md text-sm font-semibold ${getScoreBgColor(s.stats?.avg_overall ?? null)} ${getScoreColor(s.stats?.avg_overall ?? null)}`}>
                    {formatScore(s.stats?.avg_overall ?? null)}
                  </span>
                </div>
              </td>
              <td className="px-2 py-3">
                <CoverageBar
                  percent={s.stats?.coverage_percent || 0}
                  reviewCount={s.stats?.review_count || 0}
                  totalReviewers={s.stats?.total_reviewers || 0}
                />
              </td>
              <td className="px-2 py-3">
                {s.stats?.shortlist_status && (
                  <ShortlistBadge status={s.stats.shortlist_status} />
                )}
              </td>
              <td className="px-2 py-3">
                <button
                  onClick={() => onSelectSubmission(s)}
                  className="inline-flex items-center justify-center px-3 py-1.5 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium text-xs rounded-lg cursor-pointer transition-colors whitespace-nowrap"
                >
                  Manage
                </button>
              </td>
            </tr>
          ))}
          {submissions.length === 0 && (
            <tr>
              <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                No submissions found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
