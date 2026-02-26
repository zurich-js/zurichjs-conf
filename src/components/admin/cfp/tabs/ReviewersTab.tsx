/**
 * Reviewers Tab Component
 * Manages CFP reviewers - list, invite, update, revoke
 */

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import { cfpQueryKeys, type CfpAdminReviewer, type CfpAdminReviewerWithActivity } from '@/lib/types/cfp-admin';
import { Pagination } from '@/components/atoms';
import { InviteReviewerForm } from '../InviteReviewerForm';
import { ReviewerModal } from '../ReviewerModal';
import { formatScore } from '@/lib/cfp/scoring';

type ReviewerData = CfpAdminReviewer | CfpAdminReviewerWithActivity;

function hasActivityData(r: ReviewerData): r is CfpAdminReviewerWithActivity {
  return 'total_reviews' in r;
}

interface ReviewersTabProps {
  reviewers: ReviewerData[];
  isLoading: boolean;
}

export function ReviewersTab({ reviewers, isLoading }: ReviewersTabProps) {
  const [selectedReviewer, setSelectedReviewer] = useState<ReviewerData | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
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
      case 'super_admin':
        return 'bg-purple-100 text-purple-800';
      case 'reviewer':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-black';
    }
  };

  // Filter reviewers
  const filteredReviewers = useMemo(() => {
    let result = reviewers.filter(r => r.is_active);

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

    return result;
  }, [reviewers, roleFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredReviewers.length / ITEMS_PER_PAGE);
  const paginatedReviewers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredReviewers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredReviewers, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, statusFilter]);

  return (
    <div>
      {/* Invite Form and Filters */}
      <div className="mb-6 flex flex-col gap-4">
        <InviteReviewerForm />
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="reviewer">Reviewer</option>
            <option value="readonly">Read Only</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
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
                    {r.role === 'super_admin' ? 'Super Admin' : r.role === 'reviewer' ? 'Reviewer' : 'Read Only'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Invited {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {showActivityColumns && hasActivityData(r) && (
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="bg-white rounded px-2 py-1">
                      <span className="text-gray-500">Reviews:</span>{' '}
                      <span className="font-medium text-black">{r.total_reviews}</span>
                    </div>
                    <div className="bg-white rounded px-2 py-1">
                      <span className="text-gray-500">Last 7d:</span>{' '}
                      <span className="font-medium text-black">{r.reviews_last_7_days}</span>
                    </div>
                    <div className="bg-white rounded px-2 py-1">
                      <span className="text-gray-500">Last Active:</span>{' '}
                      <span className="font-medium text-black">
                        {r.last_activity_at ? new Date(r.last_activity_at).toLocaleDateString() : '-'}
                      </span>
                    </div>
                    <div className="bg-white rounded px-2 py-1">
                      <span className="text-gray-500">Avg Score:</span>{' '}
                      <span className="font-medium text-black">{formatScore(r.avg_score_given)}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {showActivityColumns && (
                    <button
                      onClick={() => router.push(`/admin/cfp/reviewers/${r.id}`)}
                      className="px-3 py-1.5 text-xs font-medium text-[#F1E271] bg-black hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
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
              <div className="text-center py-8 text-gray-500">
                {roleFilter !== 'all' || statusFilter !== 'all' ? 'No reviewers match your filters' : 'No reviewers found'}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-black font-semibold">
                <tr>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Access Level</th>
                  <th className="px-3 py-3">Status</th>
                  {showActivityColumns && (
                    <>
                      <th className="px-3 py-3 text-center">Reviews</th>
                      <th className="px-3 py-3 text-center">7 Days</th>
                      <th className="px-3 py-3">Last Active</th>
                      <th className="px-3 py-3 text-center">Avg Score</th>
                    </>
                  )}
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedReviewers.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-medium text-black">{r.name || '-'}</td>
                    <td className="px-3 py-3 text-sm text-black">{r.email}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeStyle(r.role)}`}>
                        {r.role === 'super_admin' ? 'Super Admin' : r.role === 'reviewer' ? 'Reviewer' : 'Read Only'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {r.accepted_at ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Active</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">Pending</span>
                      )}
                    </td>
                    {showActivityColumns && hasActivityData(r) && (
                      <>
                        <td className="px-3 py-3 text-sm text-black text-center font-medium">{r.total_reviews}</td>
                        <td className="px-3 py-3 text-sm text-black text-center">{r.reviews_last_7_days}</td>
                        <td className="px-3 py-3 text-sm text-black">
                          {r.last_activity_at ? new Date(r.last_activity_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-3 py-3 text-sm text-black text-center">
                          {formatScore(r.avg_score_given)}
                        </td>
                      </>
                    )}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {showActivityColumns && (
                          <button
                            onClick={() => router.push(`/admin/cfp/reviewers/${r.id}`)}
                            className="px-2 py-1 text-xs font-medium text-[#F1E271] bg-black hover:bg-gray-800 rounded transition-colors cursor-pointer"
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
                          className="px-2 py-1 text-xs font-medium text-black bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer"
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
                    <td colSpan={showActivityColumns ? 10 : 6} className="px-4 py-8 text-center text-black">
                      {roleFilter !== 'all' || statusFilter !== 'all' ? 'No reviewers match your filters' : 'No reviewers found'}
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
        </>
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
    </div>
  );
}
