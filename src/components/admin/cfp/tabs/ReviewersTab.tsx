/**
 * Reviewers Tab Component
 * Manages CFP reviewers - list, invite, update, revoke
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import { cfpQueryKeys, type CfpAdminReviewer } from '@/lib/types/cfp-admin';
import { InviteReviewerForm } from '../InviteReviewerForm';
import { ReviewerModal } from '../ReviewerModal';

interface ReviewersTabProps {
  reviewers: CfpAdminReviewer[];
  isLoading: boolean;
}

export function ReviewersTab({ reviewers, isLoading }: ReviewersTabProps) {
  const [selectedReviewer, setSelectedReviewer] = useState<CfpAdminReviewer | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

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

  const activeReviewers = reviewers.filter(r => r.is_active);

  return (
    <div>
      <div className="mb-6">
        <InviteReviewerForm />
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {activeReviewers.map((r) => (
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
                <div className="flex items-center gap-2">
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
            {activeReviewers.length === 0 && (
              <div className="text-center py-8 text-gray-500">No reviewers found</div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-black font-semibold">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Access Level</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Invited</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activeReviewers.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 font-medium text-black">{r.name || '-'}</td>
                    <td className="px-4 py-4 text-sm text-black">{r.email}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeStyle(r.role)}`}>
                        {r.role === 'super_admin' ? 'Super Admin' : r.role === 'reviewer' ? 'Reviewer' : 'Read Only'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {r.accepted_at ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Active</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-black">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
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
                {activeReviewers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-black">
                      No reviewers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
