/**
 * Reviewers Tab Component
 * Manages CFP reviewers - list, invite, update, revoke
 */

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { CFP_REVIEWER_ROLES } from '@/lib/types/cfp';
import { cfpQueryKeys, type CfpAdminReviewer, type CfpAdminReviewerWithActivity } from '@/lib/types/cfp-admin';
import { BusyArea, Pagination } from '@/components/atoms';
import { InviteReviewerForm } from '../InviteReviewerForm';
import { ReviewerModal } from '../ReviewerModal';
import { formatScore } from '@/lib/cfp/scoring';
import { formatRatingSpreadLabel } from '@/lib/cfp/reviewer-scoring';
import { cycleMultiSort, getMultiSortDirection, SortIndicator, type MultiSort } from '../tableSort';

type ReviewerData = CfpAdminReviewer | CfpAdminReviewerWithActivity;

function hasActivityData(r: ReviewerData): r is CfpAdminReviewerWithActivity {
  return 'total_reviews' in r;
}

interface ReviewersTabProps {
  reviewers: ReviewerData[];
  isLoading: boolean;
}

type ReviewerSortKey = 'name' | 'role' | 'status' | 'reviews' | 'reviews7d' | 'lastActive' | 'avgScore';
type ContributorSortKey = 'rating' | 'reviews' | 'feedbackShare';

export function ReviewersTab({ reviewers, isLoading }: ReviewersTabProps) {
  const [selectedReviewer, setSelectedReviewer] = useState<ReviewerData | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState<MultiSort<ReviewerSortKey>>([]);
  const [contributorSort, setContributorSort] = useState<MultiSort<ContributorSortKey>>([{ key: 'rating', direction: 'desc' }]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const ITEMS_PER_PAGE = 10;
  const queryClient = useQueryClient();
  const toast = useToast();
  const router = useRouter();

  // Check if we have activity data
  const showActivityColumns = reviewers.length > 0 && hasActivityData(reviewers[0]);

  // Resend invitation mutation
  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/cfp/reviewers/${id}/resend`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to resend');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Invitation Sent', 'The reviewer has been sent a new invitation email.');
    },
    onError: (err: Error) => {
      toast.error('Failed to Resend', err.message);
    },
  });

  // Update reviewer mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { role?: string; can_see_speaker_identity?: boolean } }) => {
      const res = await fetch(`/api/admin/cfp/reviewers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.reviewers });
      setSelectedReviewer(null);
      toast.success('Reviewer Updated', 'Access level has been updated successfully.');
    },
    onError: (err: Error) => {
      toast.error('Update Failed', err.message);
    },
  });

  // Revoke access mutation
  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/cfp/reviewers/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to revoke');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.reviewers });
      setSelectedReviewer(null);
      toast.success('Access Revoked', 'The reviewer no longer has access to the CFP system.');
    },
    onError: (err: Error) => {
      toast.error('Revoke Failed', err.message);
    },
  });

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case CFP_REVIEWER_ROLES.SUPER_ADMIN:
        return 'bg-purple-100 text-purple-800';
      case CFP_REVIEWER_ROLES.COMMITTEE_MEMBER:
        return 'bg-amber-100 text-amber-800';
      case CFP_REVIEWER_ROLES.REVIEWER:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-text-brand-gray-lightest text-black';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case CFP_REVIEWER_ROLES.SUPER_ADMIN:
        return 'Super Admin';
      case CFP_REVIEWER_ROLES.COMMITTEE_MEMBER:
        return 'Committee Member';
      case CFP_REVIEWER_ROLES.REVIEWER:
        return 'Anonymous Review';
      case CFP_REVIEWER_ROLES.READONLY:
        return 'Read Only';
      default:
        return role.replace(/_/g, ' ');
    }
  };

  // Filter reviewers
  const filteredReviewers = useMemo(() => {
    let result = reviewers.filter(r => r.is_active);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((r) =>
        (r.name || '').toLowerCase().includes(query) || r.email.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      result = result.filter((r) => r.role === roleFilter);
    }

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter((r) => r.accepted_at);
    } else if (statusFilter === 'pending') {
      result = result.filter((r) => !r.accepted_at);
    }

    result.sort((a, b) => {
      const compareByKey = (key: ReviewerSortKey) => {
        const compareText = (aValue: string | null | undefined, bValue: string | null | undefined) =>
          (aValue || '').localeCompare(bValue || '', undefined, { sensitivity: 'base' });

        const compareNum = (aValue: number | null | undefined, bValue: number | null | undefined) =>
          (aValue || 0) - (bValue || 0);

        const compareDate = (aValue: string | null | undefined, bValue: string | null | undefined) =>
          (new Date(aValue || 0).getTime() || 0) - (new Date(bValue || 0).getTime() || 0);

        switch (key) {
          case 'name':
            return compareText(a.name, b.name);
          case 'role':
            return compareText(a.role, b.role);
          case 'status':
            return compareNum(a.accepted_at ? 1 : 0, b.accepted_at ? 1 : 0);
          case 'reviews':
            return compareNum(hasActivityData(a) ? a.total_reviews : 0, hasActivityData(b) ? b.total_reviews : 0);
          case 'reviews7d':
            return compareNum(hasActivityData(a) ? a.reviews_last_7_days : 0, hasActivityData(b) ? b.reviews_last_7_days : 0);
          case 'lastActive':
            return compareDate(hasActivityData(a) ? a.last_activity_at : null, hasActivityData(b) ? b.last_activity_at : null);
          case 'avgScore':
            return compareNum(hasActivityData(a) ? a.avg_score_given : null, hasActivityData(b) ? b.avg_score_given : null);
          default:
            return 0;
        }
      };

      for (const rule of sort) {
        const cmp = compareByKey(rule.key);
        if (cmp !== 0) {
          return rule.direction === 'asc' ? cmp : -cmp;
        }
      }

      return 0;
    });

    return result;
  }, [reviewers, roleFilter, statusFilter, searchQuery, sort]);

  // Pagination
  const totalPages = Math.ceil(filteredReviewers.length / ITEMS_PER_PAGE);
  const paginatedReviewers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredReviewers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredReviewers, currentPage]);

  const contributors = useMemo(() => {
    return filteredReviewers
      .filter((r): r is CfpAdminReviewerWithActivity => hasActivityData(r) && r.total_reviews > 0)
      .slice()
      .sort((a, b) => {
        const compareByKey = (key: ContributorSortKey) => {
          switch (key) {
            case 'rating':
              return a.contribution_score - b.contribution_score;
            case 'reviews':
              return a.total_reviews - b.total_reviews;
            case 'feedbackShare':
              return a.feedback_written_percent - b.feedback_written_percent;
            default:
              return 0;
          }
        };

        for (const rule of contributorSort) {
          const cmp = compareByKey(rule.key);
          if (cmp !== 0) {
            return rule.direction === 'asc' ? cmp : -cmp;
          }
        }

        return b.contribution_score - a.contribution_score || b.total_reviews - a.total_reviews;
      });
  }, [filteredReviewers, contributorSort]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, statusFilter, searchQuery, sort]);

  const toggleSort = (key: ReviewerSortKey) => {
    setSort((prev) => cycleMultiSort(prev, key));
  };

  const toggleContributorSort = (key: ContributorSortKey) => {
    setContributorSort((prev) => cycleMultiSort(prev, key));
  };

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviewers by name or email..."
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-black placeholder-gray-500 focus:ring-2 focus:ring-brand-primary focus:outline-none"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-brand-primary focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value={CFP_REVIEWER_ROLES.SUPER_ADMIN}>Super Admin</option>
            <option value={CFP_REVIEWER_ROLES.COMMITTEE_MEMBER}>Committee Member</option>
            <option value={CFP_REVIEWER_ROLES.REVIEWER}>Anonymous Review</option>
            <option value={CFP_REVIEWER_ROLES.READONLY}>Read Only</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-brand-primary focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
          </select>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-brand-primary hover:bg-[#e8d95e] text-black font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Invite Reviewer
          </button>
        </div>
      </div>
      <BusyArea busy={isLoading}>
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {paginatedReviewers.map((r) => (
              <div key={r.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-black text-sm">{r.name || 'No name'}</div>
                    <div className="text-xs text-gray-600 truncate">{r.email}</div>
                  </div>
                  {r.accepted_at ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium shrink-0">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium shrink-0">Pending</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeStyle(r.role)}`}>
                    {getRoleLabel(r.role)}
                  </span>
                  <span className="text-xs text-brand-gray-medium">
                    Invited {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {showActivityColumns && hasActivityData(r) && (
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="bg-white rounded px-2 py-1">
                      <span className="text-brand-gray-medium">Reviews:</span>{' '}
                      <span className="font-medium text-black">{r.total_reviews}</span>
                    </div>
                    <div className="bg-white rounded px-2 py-1">
                      <span className="text-brand-gray-medium">Last 7d:</span>{' '}
                      <span className="font-medium text-black">{r.reviews_last_7_days}</span>
                    </div>
                    <div className="bg-white rounded px-2 py-1">
                      <span className="text-brand-gray-medium">Last Active:</span>{' '}
                      <span className="font-medium text-black">
                        {r.last_activity_at ? new Date(r.last_activity_at).toLocaleDateString() : '-'}
                      </span>
                    </div>
                    <div className="bg-white rounded px-2 py-1">
                      <span className="text-brand-gray-medium">Avg Score:</span>{' '}
                      <span className="font-medium text-black">{formatScore(r.avg_score_given)}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {showActivityColumns && (
                    <button
                      onClick={() => router.push(`/admin/cfp/reviewers/${r.id}`)}
                      className="px-3 py-1.5 text-xs font-medium text-brand-primary bg-black hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                    >
                      Activity
                    </button>
                  )}
                  {!r.accepted_at && (
                    <button
                      onClick={() => resendMutation.mutate(r.id)}
                      disabled={resendMutation.isPending}
                      className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Resend
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedReviewer(r)}
                    className="px-3 py-1.5 text-xs font-medium text-black bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors cursor-pointer"
                  >
                    Manage
                  </button>
                </div>
              </div>
            ))}
            {paginatedReviewers.length === 0 && (
              <div className="text-center py-8 text-brand-gray-medium">
                {roleFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() ? 'No reviewers match your filters' : 'No reviewers found'}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-black font-semibold">
                <tr>
                  <th className="px-3 py-3">
                    <button type="button" onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 cursor-pointer">
                      <span>Name</span><SortIndicator direction={getMultiSortDirection(sort, 'name')} />
                    </button>
                  </th>
                  {showActivityColumns && (
                    <>
                      <th className="px-3 py-3 text-center">
                        <button type="button" onClick={() => toggleSort('reviews')} className="inline-flex items-center gap-1 cursor-pointer">
                          <span>Reviews</span><SortIndicator direction={getMultiSortDirection(sort, 'reviews')} />
                        </button>
                      </th>
                      <th className="px-3 py-3 text-center">
                        <button type="button" onClick={() => toggleSort('reviews7d')} className="inline-flex items-center gap-1 cursor-pointer">
                          <span>7 Days</span><SortIndicator direction={getMultiSortDirection(sort, 'reviews7d')} />
                        </button>
                      </th>
                      <th className="px-3 py-3 text-center">
                        <button type="button" onClick={() => toggleSort('avgScore')} className="inline-flex items-center gap-1 cursor-pointer">
                          <span>Avg Score</span><SortIndicator direction={getMultiSortDirection(sort, 'avgScore')} />
                        </button>
                      </th>
                    </>
                  )}
                  <th className="px-3 py-3">
                    <button type="button" onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 cursor-pointer">
                      <span>Status</span><SortIndicator direction={getMultiSortDirection(sort, 'status')} />
                    </button>
                  </th>
                  {showActivityColumns && (
                    <th className="px-3 py-3">
                      <button type="button" onClick={() => toggleSort('lastActive')} className="inline-flex items-center gap-1 cursor-pointer">
                        <span>Last Active</span><SortIndicator direction={getMultiSortDirection(sort, 'lastActive')} />
                      </button>
                    </th>
                  )}
                  <th className="px-3 py-3">
                    <button type="button" onClick={() => toggleSort('role')} className="inline-flex items-center gap-1 cursor-pointer">
                      <span>Access Level</span><SortIndicator direction={getMultiSortDirection(sort, 'role')} />
                    </button>
                  </th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedReviewers.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-medium text-black">{r.name || '-'}</td>
                    {showActivityColumns && hasActivityData(r) && (
                      <>
                        <td className="px-3 py-3 text-sm text-black text-center font-medium">{r.total_reviews}</td>
                        <td className="px-3 py-3 text-sm text-black text-center">{r.reviews_last_7_days}</td>
                        <td className="px-3 py-3 text-sm text-black text-center">
                          {formatScore(r.avg_score_given)}
                        </td>
                      </>
                    )}
                    <td className="px-3 py-3">
                      {r.accepted_at ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Active</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">Pending</span>
                      )}
                    </td>
                    {showActivityColumns && hasActivityData(r) && (
                      <td className="px-3 py-3 text-sm text-black">
                        {r.last_activity_at ? new Date(r.last_activity_at).toLocaleDateString() : '-'}
                      </td>
                    )}
                    <td className="px-3 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeStyle(r.role)}`}>
                        {getRoleLabel(r.role)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {showActivityColumns && (
                          <button
                            onClick={() => router.push(`/admin/cfp/reviewers/${r.id}`)}
                            className="px-2 py-1 text-xs font-medium text-brand-primary bg-black hover:bg-gray-800 rounded transition-colors cursor-pointer"
                            title="View Activity"
                          >
                            Activity
                          </button>
                        )}
                        {!r.accepted_at && (
                          <button
                            onClick={() => resendMutation.mutate(r.id)}
                            disabled={resendMutation.isPending}
                            className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors cursor-pointer disabled:opacity-50"
                            title="Resend Invitation"
                          >
                            Resend
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedReviewer(r)}
                          className="px-2 py-1 text-xs font-medium text-black bg-text-brand-gray-lightest hover:bg-gray-200 rounded transition-colors cursor-pointer"
                          title="Manage Reviewer"
                        >
                          Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedReviewers.length === 0 && (
                  <tr>
                    <td colSpan={showActivityColumns ? 8 : 4} className="px-4 py-8 text-center text-black">
                      {roleFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() ? 'No reviewers match your filters' : 'No reviewers found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={ITEMS_PER_PAGE}
            totalItems={filteredReviewers.length}
            variant="light"
          />

          {showActivityColumns && contributors.length > 0 && (
            <section className="mt-8">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-black">Top Contributors</h3>
                <p className="text-sm text-gray-600">
                  Full ranked contributor list for discount decisions.
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full bg-white">
                  <thead className="bg-gray-50 text-left text-sm text-black font-semibold">
                    <tr>
                      <th className="px-3 py-3 text-center">
                        <button type="button" onClick={() => toggleContributorSort('rating')} className="inline-flex items-center gap-1 cursor-pointer">
                          <span>Rating</span><SortIndicator direction={getMultiSortDirection(contributorSort, 'rating')} />
                        </button>
                      </th>
                      <th className="px-3 py-3">Reviewer</th>
                      <th className="px-3 py-3 text-center">
                        <button type="button" onClick={() => toggleContributorSort('reviews')} className="inline-flex items-center gap-1 cursor-pointer">
                          <span>Reviews</span><SortIndicator direction={getMultiSortDirection(contributorSort, 'reviews')} />
                        </button>
                      </th>
                      <th className="px-3 py-3 text-center">
                        <button type="button" onClick={() => toggleContributorSort('feedbackShare')} className="inline-flex items-center gap-1 cursor-pointer">
                          <span>Feedback Share</span><SortIndicator direction={getMultiSortDirection(contributorSort, 'feedbackShare')} />
                        </button>
                      </th>
                      <th className="px-3 py-3 text-center">Score Range</th>
                      <th className="px-3 py-3">Score Breakdown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm">
                    <tr className="bg-white">
                      <td colSpan={6} className="px-3 py-3 text-xs text-gray-600">
                        Rating is a 100-point reviewer contribution score: 45 points for review volume, 35 points for written internal or speaker feedback, 15 points for useful overall score range, and 5 points for category score range.
                      </td>
                    </tr>
                    {contributors.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex min-w-12 justify-center rounded bg-black px-2 py-1 font-bold text-brand-primary">
                            {formatScore(r.contribution_score)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            href={`/admin/cfp/reviewers/${r.id}`}
                            className="font-medium text-black underline decoration-gray-300 underline-offset-2 hover:decoration-black"
                          >
                            {r.name || r.email}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-center text-black">{r.total_reviews}</td>
                        <td className="px-3 py-3 text-center text-black">
                          {Math.round(r.feedback_written_percent)}%
                          <span className="ml-1 text-xs text-brand-gray-medium">({r.feedback_written_count})</span>
                        </td>
                        <td className="px-3 py-3 text-center text-black" title={`Overall score range: ${formatScore(r.rating_spread)}`}>
                          {formatRatingSpreadLabel(r.rating_spread)}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600">
                          {formatScore(r.contribution_volume_score)} volume + {formatScore(r.contribution_feedback_score)} feedback + {formatScore(r.contribution_rating_spread_score)} overall range + {formatScore(r.contribution_category_rating_spread_score)} category range
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      </BusyArea>

      {/* Reviewer Management Modal */}
      {selectedReviewer && (
        <ReviewerModal
          reviewer={selectedReviewer}
          onClose={() => setSelectedReviewer(null)}
          onUpdate={(updates) => updateMutation.mutate({ id: selectedReviewer.id, updates })}
          onRevoke={() => {
            revokeMutation.mutate(selectedReviewer.id);
          }}
          isUpdating={updateMutation.isPending}
          isRevoking={revokeMutation.isPending}
        />
      )}

      {/* Invite Reviewer Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-black">Invite Reviewer</h3>
              <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-text-brand-gray-lightest rounded-lg cursor-pointer">
                <X className="w-5 h-5 text-black" />
              </button>
            </div>
            <div className="p-6">
              <InviteReviewerForm
                variant="modal"
                onCancel={() => setShowInviteModal(false)}
                onInvited={() => setShowInviteModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
