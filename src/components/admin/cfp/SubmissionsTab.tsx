/**
 * CFP Submissions Tab Component
 * Table/card view for managing CFP submissions
 */

import { useState, useMemo, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Pagination } from '@/components/atoms';
import { StatusBadge } from './StatusBadge';
import { ShortlistBadge } from './ShortlistBadge';
import { SpeakerAvatar } from './SpeakerAvatar';
import {
  getScoreColor,
  getScoreBgColor,
  CoverageBar,
  ActiveFiltersBar,
} from './SubmissionsTabHelpers';
import type { CfpAdminSubmission } from '@/lib/types/cfp-admin';
import { formatScore } from '@/lib/cfp/scoring';

const ITEMS_PER_PAGE = 10;

interface SubmissionSearchFilters {
  include: string[];
  exclude: string[];
}

function parseSubmissionSearch(search: string): SubmissionSearchFilters {
  const filters: SubmissionSearchFilters = { include: [], exclude: [] };
  const tokens = search.match(/-?"[^"]+"|-?\S+/g) || [];

  for (const rawToken of tokens) {
    const isExclude = rawToken.startsWith('-');
    const token = isExclude ? rawToken.slice(1) : rawToken;
    if (!token) continue;

    const unquoted = token.startsWith('"') && token.endsWith('"')
      ? token.slice(1, -1)
      : token;
    const normalized = unquoted.trim().toLowerCase();
    if (!normalized) continue;

    if (isExclude) filters.exclude.push(normalized);
    else filters.include.push(normalized);
  }

  return filters;
}

function matchesSubmissionSearch(submission: CfpAdminSubmission, filters: SubmissionSearchFilters): boolean {
  const speaker = submission.speaker
    ? `${submission.speaker.first_name || ''} ${submission.speaker.last_name || ''} ${submission.speaker.email || ''}`
    : '';
  const tags = (submission.tags || []).map((tag) => tag.name).join(' ');
  const haystack = `${submission.title} ${submission.abstract} ${speaker} ${tags}`.toLowerCase();

  if (filters.include.some((term) => !haystack.includes(term))) {
    return false;
  }

  if (filters.exclude.some((term) => haystack.includes(term))) {
    return false;
  }

  return true;
}

interface SubmissionsTabProps {
  submissions: CfpAdminSubmission[];
  isLoading: boolean;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  toggleSelectAll: () => void;
  bulkActionStatus: string;
  setBulkActionStatus: (v: string) => void;
  bulkUpdateStatusMutation: ReturnType<typeof useMutation<void, Error, { ids: string[]; status: string }>>;
  onSelectSubmission: (s: CfpAdminSubmission) => void;
}

export function SubmissionsTab({
  submissions,
  isLoading,
  statusFilter,
  setStatusFilter,
  selectedIds,
  toggleSelection,
  toggleSelectAll,
  bulkActionStatus,
  setBulkActionStatus,
  bulkUpdateStatusMutation,
  onSelectSubmission,
}: SubmissionsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [minReviews, setMinReviews] = useState<string>('0');
  const [shortlistOnly, setShortlistOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and sort submissions
  const filteredSubmissions = useMemo(() => {
    let result = [...submissions];

    if (searchQuery.trim()) {
      const filters = parseSubmissionSearch(searchQuery);
      if (filters.include.length > 0 || filters.exclude.length > 0) {
        result = result.filter((submission) => matchesSubmissionSearch(submission, filters));
      }
    }

    if (typeFilter !== 'all') {
      result = result.filter((s) => s.submission_type === typeFilter);
    }

    // Min reviews filter
    const minReviewCount = minReviews === '5+' ? 5 : parseInt(minReviews, 10);
    if (minReviewCount > 0) {
      result = result.filter((s) => (s.stats?.review_count || 0) >= minReviewCount);
    }

    // Shortlist only filter
    if (shortlistOnly) {
      result = result.filter((s) => s.stats?.shortlist_status === 'likely_shortlisted');
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'most_reviews':
          return (b.stats?.review_count || 0) - (a.stats?.review_count || 0);
        case 'least_reviews':
          return (a.stats?.review_count || 0) - (b.stats?.review_count || 0);
        case 'highest_score':
          return (b.stats?.avg_overall || 0) - (a.stats?.avg_overall || 0);
        case 'lowest_score':
          return (a.stats?.avg_overall || 0) - (b.stats?.avg_overall || 0);
        case 'highest_coverage':
          return (b.stats?.coverage_percent || 0) - (a.stats?.coverage_percent || 0);
        case 'lowest_coverage':
          return (a.stats?.coverage_percent || 0) - (b.stats?.coverage_percent || 0);
        case 'last_reviewed':
          const aTime = a.stats?.last_reviewed_at ? new Date(a.stats.last_reviewed_at).getTime() : 0;
          const bTime = b.stats?.last_reviewed_at ? new Date(b.stats.last_reviewed_at).getTime() : 0;
          return bTime - aTime;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return result;
  }, [submissions, searchQuery, typeFilter, minReviews, shortlistOnly, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE);
  const paginatedSubmissions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSubmissions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSubmissions, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, minReviews, shortlistOnly, statusFilter, sortBy]);

  return (
    <div>
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search submissions (e.g. react -"beginner" "event sourcing")...'
              className="w-full px-4 py-2 rounded-lg border border-gray-300 text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="waitlisted">Waitlisted</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="talk">Talk</option>
            <option value="workshop">Workshop</option>
            <option value="lightning">Lightning Talk</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="most_reviews">Most Reviews</option>
            <option value="least_reviews">Least Reviews</option>
            <option value="highest_score">Highest Score</option>
            <option value="lowest_score">Lowest Score</option>
            <option value="highest_coverage">Highest Coverage</option>
            <option value="lowest_coverage">Lowest Coverage</option>
            <option value="last_reviewed">Last Reviewed</option>
            <option value="title">Title A-Z</option>
          </select>
        </div>

        {/* Additional Filters Row */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <select
            value={minReviews}
            onChange={(e) => setMinReviews(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
          >
            <option value="0">Min Reviews: Any</option>
            <option value="1">Min 1 Review</option>
            <option value="2">Min 2 Reviews</option>
            <option value="3">Min 3 Reviews</option>
            <option value="4">Min 4 Reviews</option>
            <option value="5+">Min 5+ Reviews</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={shortlistOnly}
              onChange={(e) => setShortlistOnly(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#F1E271] focus:ring-[#F1E271]"
            />
            <span className="text-sm font-medium text-black">Likely Shortlisted Only</span>
          </label>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-4 py-2 w-fit">
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

        {/* Active Filters and Summary Bar */}
        <ActiveFiltersBar
          submissions={submissions}
          filteredSubmissions={filteredSubmissions}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          minReviews={minReviews}
          shortlistOnly={shortlistOnly}
          onClearSearch={() => setSearchQuery('')}
          onClearStatus={() => setStatusFilter('all')}
          onClearType={() => setTypeFilter('all')}
          onClearMinReviews={() => setMinReviews('0')}
          onClearShortlist={() => setShortlistOnly(false)}
          onClearAll={() => {
            setSearchQuery('');
            setStatusFilter('all');
            setTypeFilter('all');
            setMinReviews('0');
            setShortlistOnly(false);
          }}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <MobileSubmissionsList
            submissions={paginatedSubmissions}
            selectedIds={selectedIds}
            toggleSelection={toggleSelection}
            toggleSelectAll={toggleSelectAll}
            onSelectSubmission={onSelectSubmission}
          />

          {/* Desktop Table View */}
          <DesktopSubmissionsTable
            submissions={paginatedSubmissions}
            selectedIds={selectedIds}
            toggleSelection={toggleSelection}
            toggleSelectAll={toggleSelectAll}
            onSelectSubmission={onSelectSubmission}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={ITEMS_PER_PAGE}
            totalItems={filteredSubmissions.length}
            variant="light"
          />
        </>
      )}
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
}: {
  submissions: CfpAdminSubmission[];
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  toggleSelectAll: () => void;
  onSelectSubmission: (s: CfpAdminSubmission) => void;
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
            <th className="px-2 py-3">Title</th>
            <th className="px-2 py-3">Speaker</th>
            <th className="px-2 py-3 w-20">Type</th>
            <th className="px-2 py-3 w-24">Status</th>
            <th className="px-2 py-3 w-20 text-center">Reviews</th>
            <th className="px-2 py-3 w-16 text-center">Score</th>
            <th className="px-2 py-3 w-20 text-center">Coverage</th>
            <th className="px-2 py-3 w-32">Shortlist</th>
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
