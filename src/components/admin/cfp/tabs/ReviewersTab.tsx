/**
 * Reviewers Tab Component
 * Manages CFP reviewers - list, invite, update, revoke
 */

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Plus, X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { CFP_REVIEWER_ROLES } from '@/lib/types/cfp';
import { cfpQueryKeys, type CfpAdminReviewer, type CfpAdminReviewerWithActivity } from '@/lib/types/cfp-admin';
import { Pagination } from '@/components/atoms';
import { AdminDataTable, AdminMobileCard, AdminTableToolbar } from '@/components/admin/common';
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
const columnHelper = createColumnHelper<ReviewerData>();

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

  const hasActiveFilters = Boolean(roleFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim());

  return (
    <div>
      <AdminDataTable
        data={paginatedReviewers}
        columns={getReviewerColumns({
          showActivityColumns,
          sort,
          toggleSort,
          router,
          resendMutation,
          setSelectedReviewer,
          getRoleBadgeStyle,
          getRoleLabel,
        })}
        isLoading={isLoading}
        emptyState={roleFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() ? 'No reviewers match your filters' : 'No reviewers found'}
        toolbar={(
          <AdminTableToolbar
            left={hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('all');
                  setStatusFilter('all');
                }}
                className="ml-2 inline-flex text-xs text-brand-gray-dark underline hover:text-black cursor-pointer"
              >
                Reset filters
              </button>
            ) : undefined}
            right={(
              <>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reviewers by name or email..."
                  className="min-w-[260px] flex-1 rounded-lg border border-gray-300 px-4 py-2 text-black placeholder-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-primary lg:flex-none"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
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
                  className="rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                </select>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 font-semibold text-black transition-all hover:bg-[#e8d95e]"
                >
                  <Plus className="w-4 h-4" />
                  Invite Reviewer
                </button>
              </>
            )}
          />
        )}
        mobileList={{
          renderCard: (r) => (
            <AdminMobileCard key={r.id} className="bg-gray-50">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-black">{r.name || 'No name'}</div>
                  <div className="truncate text-xs text-brand-gray-dark">{r.email}</div>
                </div>
                {r.accepted_at ? (
                  <span className="shrink-0 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Active</span>
                ) : (
                  <span className="shrink-0 rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">Pending</span>
                )}
              </div>
              <div className="mb-3 flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${getRoleBadgeStyle(r.role)}`}>
                  {getRoleLabel(r.role)}
                </span>
                <span className="text-xs text-brand-gray-medium">Invited {new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {showActivityColumns && hasActivityData(r) ? (
                <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-white px-2 py-1"><span className="text-brand-gray-medium">Reviews:</span> <span className="font-medium text-black">{r.total_reviews}</span></div>
                  <div className="rounded bg-white px-2 py-1"><span className="text-brand-gray-medium">Last 7d:</span> <span className="font-medium text-black">{r.reviews_last_7_days}</span></div>
                  <div className="rounded bg-white px-2 py-1"><span className="text-brand-gray-medium">Last Active:</span> <span className="font-medium text-black">{r.last_activity_at ? new Date(r.last_activity_at).toLocaleDateString() : '-'}</span></div>
                  <div className="rounded bg-white px-2 py-1"><span className="text-brand-gray-medium">Avg Score:</span> <span className="font-medium text-black">{formatScore(r.avg_score_given)}</span></div>
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                {showActivityColumns ? (
                  <button onClick={() => router.push(`/admin/cfp/reviewers/${r.id}`)} className="rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-brand-primary transition-colors hover:bg-gray-800">Activity</button>
                ) : null}
                {!r.accepted_at ? (
                  <button
                    onClick={() => resendMutation.mutate(r.id)}
                    disabled={resendMutation.isPending}
                    className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
                  >
                    Resend
                  </button>
                ) : null}
                <button onClick={() => setSelectedReviewer(r)} className="rounded-lg bg-brand-gray-lightest px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-gray-300">
                  Manage
                </button>
              </div>
            </AdminMobileCard>
          ),
          emptyState: (
            <div className="py-8 text-center text-brand-gray-medium">
              {roleFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() ? 'No reviewers match your filters' : 'No reviewers found'}
            </div>
          ),
        }}
        pagination={(
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={ITEMS_PER_PAGE}
            totalItems={filteredReviewers.length}
            variant="light"
          />
        )}
      />

          {showActivityColumns && contributors.length > 0 && (
            <section className="mt-8">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-black">Top Contributors</h3>
                <p className="text-sm text-brand-gray-dark">
                  Full ranked contributor list for discount decisions.
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg border border-brand-gray-lightest">
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
                  <tbody className="divide-y divide-brand-gray-lightest text-sm">
                    <tr className="bg-white">
                      <td colSpan={6} className="px-3 py-3 text-xs text-brand-gray-dark">
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
                        <td className="px-3 py-3 text-xs text-brand-gray-dark">
                          {formatScore(r.contribution_volume_score)} volume + {formatScore(r.contribution_feedback_score)} feedback + {formatScore(r.contribution_rating_spread_score)} overall range + {formatScore(r.contribution_category_rating_spread_score)} category range
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
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
            <div className="p-6 border-b border-brand-gray-lightest flex items-center justify-between">
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

function getReviewerColumns({
  showActivityColumns,
  sort,
  toggleSort,
  router,
  resendMutation,
  setSelectedReviewer,
  getRoleBadgeStyle,
  getRoleLabel,
}: {
  showActivityColumns: boolean;
  sort: MultiSort<ReviewerSortKey>;
  toggleSort: (key: ReviewerSortKey) => void;
  router: ReturnType<typeof useRouter>;
  resendMutation: ReturnType<typeof useMutation<unknown, Error, string>>;
  setSelectedReviewer: (reviewer: ReviewerData) => void;
  getRoleBadgeStyle: (role: string) => string;
  getRoleLabel: (role: string) => string;
}): Array<ColumnDef<ReviewerData, unknown>> {
  const columns: Array<ColumnDef<ReviewerData, unknown>> = [
    columnHelper.display({
      id: 'name',
      header: () => (
        <button type="button" onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 cursor-pointer">
          <span>Name</span><SortIndicator direction={getMultiSortDirection(sort, 'name')} />
        </button>
      ),
      cell: ({ row }) => <span className="font-medium text-black">{row.original.name || '-'}</span>,
    }),
  ];

  if (showActivityColumns) {
    columns.push(
      columnHelper.display({
        id: 'reviews',
        header: () => (
          <button type="button" onClick={() => toggleSort('reviews')} className="inline-flex items-center gap-1 cursor-pointer">
            <span>Reviews</span><SortIndicator direction={getMultiSortDirection(sort, 'reviews')} />
          </button>
        ),
        cell: ({ row }) => <div className="text-center text-sm font-medium text-black">{hasActivityData(row.original) ? row.original.total_reviews : '-'}</div>,
      }),
      columnHelper.display({
        id: 'reviews7d',
        header: () => (
          <button type="button" onClick={() => toggleSort('reviews7d')} className="inline-flex items-center gap-1 cursor-pointer">
            <span>7 Days</span><SortIndicator direction={getMultiSortDirection(sort, 'reviews7d')} />
          </button>
        ),
        cell: ({ row }) => <div className="text-center text-sm text-black">{hasActivityData(row.original) ? row.original.reviews_last_7_days : '-'}</div>,
      }),
      columnHelper.display({
        id: 'avgScore',
        header: () => (
          <button type="button" onClick={() => toggleSort('avgScore')} className="inline-flex items-center gap-1 cursor-pointer">
            <span>Avg Score</span><SortIndicator direction={getMultiSortDirection(sort, 'avgScore')} />
          </button>
        ),
        cell: ({ row }) => <div className="text-center text-sm text-black">{hasActivityData(row.original) ? formatScore(row.original.avg_score_given) : '-'}</div>,
      })
    );
  }

  columns.push(
    columnHelper.display({
      id: 'status',
      header: () => (
        <button type="button" onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 cursor-pointer">
          <span>Status</span><SortIndicator direction={getMultiSortDirection(sort, 'status')} />
        </button>
      ),
      cell: ({ row }) => row.original.accepted_at
        ? <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Active</span>
        : <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">Pending</span>,
    })
  );

  if (showActivityColumns) {
    columns.push(
      columnHelper.display({
        id: 'lastActive',
        header: () => (
          <button type="button" onClick={() => toggleSort('lastActive')} className="inline-flex items-center gap-1 cursor-pointer">
            <span>Last Active</span><SortIndicator direction={getMultiSortDirection(sort, 'lastActive')} />
          </button>
        ),
        cell: ({ row }) => <span className="text-sm text-black">{hasActivityData(row.original) && row.original.last_activity_at ? new Date(row.original.last_activity_at).toLocaleDateString() : '-'}</span>,
      })
    );
  }

  columns.push(
    columnHelper.display({
      id: 'role',
      header: () => (
        <button type="button" onClick={() => toggleSort('role')} className="inline-flex items-center gap-1 cursor-pointer">
          <span>Access Level</span><SortIndicator direction={getMultiSortDirection(sort, 'role')} />
        </button>
      ),
      cell: ({ row }) => (
        <span className={`rounded px-2 py-1 text-xs font-medium ${getRoleBadgeStyle(row.original.role)}`}>
          {getRoleLabel(row.original.role)}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {showActivityColumns ? (
            <button
              onClick={(event) => {
                event.stopPropagation();
                router.push(`/admin/cfp/reviewers/${row.original.id}`);
              }}
              className="rounded bg-black px-2 py-1 text-xs font-medium text-brand-primary transition-colors hover:bg-gray-800"
              title="View Activity"
            >
              Activity
            </button>
          ) : null}
          {!row.original.accepted_at ? (
            <button
              onClick={(event) => {
                event.stopPropagation();
                resendMutation.mutate(row.original.id);
              }}
              disabled={resendMutation.isPending}
              className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
              title="Resend Invitation"
            >
              Resend
            </button>
          ) : null}
          <button
            onClick={(event) => {
              event.stopPropagation();
              setSelectedReviewer(row.original);
            }}
            className="rounded bg-text-brand-gray-lightest px-2 py-1 text-xs font-medium text-black transition-colors hover:bg-brand-gray-lightest"
            title="Manage Reviewer"
          >
            Manage
          </button>
        </div>
      ),
    })
  );

  return columns;
}
