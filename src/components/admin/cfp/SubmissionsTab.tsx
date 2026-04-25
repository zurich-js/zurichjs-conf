/**
 * CFP Submissions Tab Component
 * Table/card view for managing CFP submissions with server-side pagination
 */

import { useMutation } from '@tanstack/react-query';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Pagination } from '@/components/atoms';
import { AdminDataTable, AdminMobileCard, AdminTableToolbar } from '@/components/admin/common';
import { StatusBadge } from './StatusBadge';
import { ShortlistBadge } from './ShortlistBadge';
import { SpeakerAvatar } from './SpeakerAvatar';
import { DecisionStatusBadges } from './DecisionStatusBadges';
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
const DECISION_STATUS_OPTIONS = ['undecided', 'accepted', 'rejected'] as const;
const EMAIL_STATE_OPTIONS = ['not_scheduled', 'pending', 'sent'] as const;
const EMAIL_STATE_LABELS: Record<string, string> = {
  not_scheduled: 'No email scheduled',
  pending: 'Email pending',
  sent: 'Email sent',
};
const columnHelper = createColumnHelper<CfpAdminSubmission>();

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
  decisionStatuses: string[];
  setDecisionStatuses: (v: string[]) => void;
  emailStates: string[];
  setEmailStates: (v: string[]) => void;
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
  bulkRejectMutation: ReturnType<
    typeof useMutation<
      { success: number; failed: number; errors: Array<{ submission_id: string; error: string }> },
      Error,
      { ids: string[]; notes?: string }
    >
  >;
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
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1 text-xs font-semibold text-black">
            {selected.length}
          </span>
        )}
        <ChevronDown className="w-4 h-4 text-brand-gray-medium" />
      </PopoverButton>
      <PopoverPanel
        anchor="bottom end"
        className="z-40 mt-2 w-64 rounded-lg border border-brand-gray-lightest bg-white p-2 shadow-lg"
      >
        <div className="max-h-64 overflow-auto space-y-1">
          {options.map((option) => {
            const checked = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleValue(option)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-black hover:bg-text-brand-gray-lightest cursor-pointer capitalize"
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
  decisionStatuses,
  setDecisionStatuses,
  emailStates,
  setEmailStates,
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
  bulkRejectMutation,
  onSelectSubmission,
}: SubmissionsTabProps) {
  const totalPages = Math.ceil(total / pageSize);

  const handleSortClick = (key: SubmissionSortKey) => {
    setSort(cycleMultiSort(sort, key));
  };

  const hasActiveFilters = Boolean(
    searchQuery || statuses.length || submissionTypes.length || shortlistStatuses.length || decisionStatuses.length || emailStates.length || coverageMin || coverageMax
  );

  return (
    <div>
      <div className="mb-6 space-y-3">
        <AdminTableToolbar
          left={hasActiveFilters && (
              <button
                  type="button"
                  onClick={() => {
                      setSearchQuery('');
                      setStatuses([]);
                      setSubmissionTypes([]);
                      setShortlistStatuses([]);
                      setDecisionStatuses([]);
                      setEmailStates([]);
                      setCoverageMin('');
                      setCoverageMax('');
                  }}
                  className="ml-2 inline-flex text-xs text-brand-gray-dark underline hover:text-black cursor-pointer"
              >
                  Reset filters
              </button>
          )}
          right={(
            <>
              <div className="relative min-w-[280px] max-w-full flex-1 lg:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Search topic content...'
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pl-10 text-sm text-black placeholder-brand-gray-medium focus:ring-2 focus:ring-brand-primary focus:outline-none"
                />
              </div>

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
              <MultiSelectFilterPopover
                label="Decision"
                options={DECISION_STATUS_OPTIONS}
                selected={decisionStatuses}
                onChange={setDecisionStatuses}
                formatOption={(value) => value}
              />
              <MultiSelectFilterPopover
                label="Email"
                options={EMAIL_STATE_OPTIONS}
                selected={emailStates}
                onChange={setEmailStates}
                formatOption={(value) => EMAIL_STATE_LABELS[value] || value}
              />

              <Popover className="relative">
                <PopoverButton className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black hover:bg-gray-50 cursor-pointer">
                  <span>Coverage</span>
                  {(coverageMin || coverageMax) && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1 text-xs font-semibold text-black">
                      1
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4 text-brand-gray-medium" />
                </PopoverButton>
                <PopoverPanel
                  anchor="bottom end"
                  className="z-40 mt-2 w-64 rounded-lg border border-brand-gray-lightest bg-white p-3 shadow-lg"
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
                        className="w-20 px-2 py-1.5 rounded-md border border-gray-300 text-sm text-black focus:ring-2 focus:ring-brand-primary focus:outline-none"
                      />
                      <span className="text-brand-gray-medium text-sm">to</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={coverageMax}
                        onChange={(e) => setCoverageMax(e.target.value)}
                        placeholder="Max"
                        className="w-20 px-2 py-1.5 rounded-md border border-gray-300 text-sm text-black focus:ring-2 focus:ring-brand-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </PopoverPanel>
              </Popover>
            </>
          )}
        />

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 bg-white rounded-lg border border-brand-gray-lightest px-4 py-2 w-fit">
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
            <div className="h-4 w-px bg-gray-300" />
            <button
              onClick={() => {
                const count = selectedIds.size;
                if (count === 0) return;
                const confirmed = window.confirm(
                  `Bulk reject ${count} submission(s)?\n\nThis creates a decision record for each (status → rejected). ` +
                  `No emails are sent — schedule those separately.`
                );
                if (!confirmed) return;
                bulkRejectMutation.mutate({ ids: Array.from(selectedIds) });
              }}
              disabled={bulkRejectMutation.isPending}
              className="px-3 py-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 cursor-pointer"
              title="Reject selected submissions and create decision records. Emails are scheduled separately."
            >
              {bulkRejectMutation.isPending ? 'Rejecting...' : 'Bulk Reject (create decisions)'}
            </button>
          </div>
        )}
      </div>

      <AdminDataTable
        data={submissions}
        columns={getSubmissionColumns({
          selectedIds,
          toggleSelection,
          toggleSelectAll,
          onSelectSubmission,
          sort,
          onSortClick: handleSortClick,
        })}
        isLoading={isLoading}
        emptyState="No submissions found"
        mobileList={{
          renderCard: (s) => (
            <AdminMobileCard
              key={s.id}
              className={`transition-all ${selectedIds.has(s.id) ? 'border-yellow-300 bg-yellow-50' : ''}`}
            >
              <div className="mb-3 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(s.id)}
                  onChange={() => toggleSelection(s.id)}
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-primary"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 flex-1 text-sm font-semibold text-black">{s.title}</h3>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={s.status} />
                      {s.status === 'rejected' ? (
                        <DecisionStatusBadges
                          hasDecisionRecord={s.decision_status === 'rejected' && Boolean(s.decision_at)}
                          emailSentAt={s.decision_email_sent_at}
                          scheduledEmailStatus={s.latest_scheduled_email_status}
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <SpeakerAvatar speaker={s.speaker} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-black">{s.speaker?.first_name} {s.speaker?.last_name}</p>
                      <p className="truncate text-xs text-brand-gray-medium">{s.speaker?.email}</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mb-3 ml-7 line-clamp-2 text-xs text-brand-gray-medium">{s.abstract}</p>
              <div className="ml-7 flex flex-col gap-3 border-t border-text-brand-gray-lightest pt-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-text-brand-gray-lightest px-2 py-1 font-medium capitalize text-black">{s.submission_type}</span>
                  <span className="text-brand-gray-medium">•</span>
                  <span className="text-brand-gray-dark">{s.stats?.review_count || 0} reviews</span>
                  <span className="text-brand-gray-medium">•</span>
                  <span className={`rounded px-2 py-0.5 font-semibold ${getScoreBgColor(s.stats?.avg_overall ?? null)} ${getScoreColor(s.stats?.avg_overall ?? null)}`}>
                    {formatScore(s.stats?.avg_overall ?? null)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-brand-gray-medium">Coverage:</span>
                  <div className="max-w-[120px] flex-1">
                    <CoverageBar
                      percent={s.stats?.coverage_percent || 0}
                      reviewCount={s.stats?.review_count || 0}
                      totalReviewers={s.stats?.total_reviewers || 0}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {s.stats?.shortlist_status ? <ShortlistBadge status={s.stats.shortlist_status} /> : <span />}
                  <button
                    onClick={() => onSelectSubmission(s)}
                    className="ml-auto flex-shrink-0 rounded-lg bg-brand-primary px-4 py-2 text-xs font-medium text-black transition-colors hover:bg-[#e8d95e]"
                  >
                    Manage
                  </button>
                </div>
              </div>
            </AdminMobileCard>
          ),
          emptyState: (
            <div className="py-12 text-center text-brand-gray-medium">No submissions found</div>
          ),
        }}
        pagination={(
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={pageSize}
            totalItems={total}
            variant="light"
          />
        )}
      />
    </div>
  );
}

function getSubmissionColumns({
  selectedIds,
  toggleSelection,
  toggleSelectAll,
  onSelectSubmission,
  sort,
  onSortClick,
}: {
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  toggleSelectAll: () => void;
  onSelectSubmission: (s: CfpAdminSubmission) => void;
  sort: MultiSort<SubmissionSortKey>;
  onSortClick: (key: SubmissionSortKey) => void;
}): Array<ColumnDef<CfpAdminSubmission, unknown>> {
  return [
    columnHelper.display({
      id: 'selection',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={selectedIds.size === table.options.data.length && table.options.data.length > 0}
          onChange={toggleSelectAll}
          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-primary"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.original.id)}
          onChange={() => toggleSelection(row.original.id)}
          onClick={(event) => event.stopPropagation()}
          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-primary"
        />
      ),
    }),
    columnHelper.display({
      id: 'title',
      header: () => (
        <button type="button" onClick={() => onSortClick('title')} className="inline-flex items-center gap-1 cursor-pointer hover:text-black/80">
          <span>Title</span>
          <SortIndicator direction={getMultiSortDirection(sort, 'title')} />
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="max-w-xs truncate font-medium text-black" title={row.original.title}>{row.original.title}</div>
          <div className="max-w-xs truncate text-xs text-brand-gray-medium" title={row.original.abstract}>{row.original.abstract}</div>
        </div>
      ),
    }),
    columnHelper.display({
      id: 'speaker',
      header: () => (
        <button type="button" onClick={() => onSortClick('speaker')} className="inline-flex items-center gap-1 cursor-pointer hover:text-black/80">
          <span>Speaker</span>
          <SortIndicator direction={getMultiSortDirection(sort, 'speaker')} />
        </button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-0">
          <SpeakerAvatar speaker={row.original.speaker} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-black" title={`${row.original.speaker?.first_name || ''} ${row.original.speaker?.last_name || ''}`}>
              {row.original.speaker?.first_name} {row.original.speaker?.last_name}
            </div>
            <div className="truncate text-xs text-brand-gray-medium" title={row.original.speaker?.email}>
              {row.original.speaker?.email}
            </div>
          </div>
        </div>
      ),
    }),
    columnHelper.display({
      id: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="inline-flex whitespace-nowrap rounded-full bg-text-brand-gray-lightest px-2 py-0.5 text-xs font-medium capitalize text-black">
          {row.original.submission_type}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={row.original.status} />
          {row.original.status === 'rejected' ? (
            <DecisionStatusBadges
              hasDecisionRecord={row.original.decision_status === 'rejected' && Boolean(row.original.decision_at)}
              emailSentAt={row.original.decision_email_sent_at}
              scheduledEmailStatus={row.original.latest_scheduled_email_status}
            />
          ) : null}
        </div>
      ),
    }),
    columnHelper.display({
      id: 'reviews',
      header: () => (
        <button type="button" onClick={() => onSortClick('reviews')} className="inline-flex items-center gap-1 cursor-pointer hover:text-black/80">
          <span>Reviews</span>
          <SortIndicator direction={getMultiSortDirection(sort, 'reviews')} />
        </button>
      ),
      cell: ({ row }) => <div className="text-center text-sm font-medium text-black">{row.original.stats?.review_count || 0}</div>,
    }),
    columnHelper.display({
      id: 'score',
      header: () => (
        <button type="button" onClick={() => onSortClick('score')} className="inline-flex items-center gap-1 cursor-pointer hover:text-black/80">
          <span>Score</span>
          <SortIndicator direction={getMultiSortDirection(sort, 'score')} />
        </button>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className={`inline-flex h-7 w-10 items-center justify-center rounded-md text-sm font-semibold ${getScoreBgColor(row.original.stats?.avg_overall ?? null)} ${getScoreColor(row.original.stats?.avg_overall ?? null)}`}>
            {formatScore(row.original.stats?.avg_overall ?? null)}
          </span>
        </div>
      ),
    }),
    columnHelper.display({
      id: 'coverage',
      header: () => (
        <button type="button" onClick={() => onSortClick('coverage')} className="inline-flex items-center gap-1 cursor-pointer hover:text-black/80">
          <span>Coverage</span>
          <SortIndicator direction={getMultiSortDirection(sort, 'coverage')} />
        </button>
      ),
      cell: ({ row }) => (
        <CoverageBar
          percent={row.original.stats?.coverage_percent || 0}
          reviewCount={row.original.stats?.review_count || 0}
          totalReviewers={row.original.stats?.total_reviewers || 0}
        />
      ),
    }),
    columnHelper.display({
      id: 'shortlist',
      header: () => (
        <button type="button" onClick={() => onSortClick('shortlist')} className="inline-flex items-center gap-1 cursor-pointer hover:text-black/80">
          <span>Shortlist</span>
          <SortIndicator direction={getMultiSortDirection(sort, 'shortlist')} />
        </button>
      ),
      cell: ({ row }) => row.original.stats?.shortlist_status ? <ShortlistBadge status={row.original.stats.shortlist_status} /> : null,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onSelectSubmission(row.original);
          }}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-[#e8d95e]"
        >
          Manage
        </button>
      ),
    }),
  ];
}
