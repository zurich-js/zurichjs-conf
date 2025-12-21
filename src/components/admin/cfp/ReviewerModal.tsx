/**
 * Reviewer Modal Component
 * Manage individual reviewer access and permissions
 */

import { useState } from 'react';
import { X, User, Ban } from 'lucide-react';
import type { CfpAdminReviewer, ReviewerRole } from '@/lib/types/cfp-admin';
import { ConfirmationModal } from './ConfirmationModal';

const REVIEWER_ROLES: { value: ReviewerRole; label: string; description: string }[] = [
  {
    value: 'full_access',
    label: 'Full Access',
    description: 'Can see speaker names, emails, and all details. Can score and leave feedback.',
  },
  {
    value: 'anonymous',
    label: 'Anonymous Review',
    description: 'Cannot see speaker names or personal details. Can score submissions blindly.',
  },
  {
    value: 'readonly',
    label: 'Read Only',
    description: 'Can view submissions but cannot score or leave feedback. Observer access.',
  },
];

interface ReviewerModalProps {
  reviewer: CfpAdminReviewer;
  onClose: () => void;
  onUpdate: (updates: { role?: string; can_see_speaker_identity?: boolean }) => void;
  onRevoke: () => void;
  isUpdating: boolean;
  isRevoking: boolean;
}

export function ReviewerModal({
  reviewer,
  onClose,
  onUpdate,
  onRevoke,
  isUpdating,
  isRevoking,
}: ReviewerModalProps) {
  const [selectedRole, setSelectedRole] = useState<ReviewerRole>(() => {
    if (reviewer.role === 'readonly') return 'readonly';
    if (reviewer.can_see_speaker_identity) return 'full_access';
    return 'anonymous';
  });
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  const handleUpdateRole = () => {
    const apiRole = selectedRole === 'readonly' ? 'readonly' : 'reviewer';
    const canSeeSpeakerIdentity = selectedRole === 'full_access';
    onUpdate({ role: apiRole, can_see_speaker_identity: canSeeSpeakerIdentity });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#F1E271] rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-black" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-black">Manage Reviewer</h3>
                <p className="text-sm text-black">{reviewer.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
              <X className="w-5 h-5 text-black" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Reviewer Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-black font-semibold mb-1">Name</p>
                <p className="text-sm text-black">{reviewer.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-black font-semibold mb-1">Status</p>
                <p className="text-sm">
                  {reviewer.accepted_at ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                      Pending Invite
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-black font-semibold mb-1">Current Role</p>
                <p className="text-sm text-black capitalize">{reviewer.role.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-black font-semibold mb-1">Invited</p>
                <p className="text-sm text-black">{new Date(reviewer.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Change Access Level */}
          <div>
            <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-3">Change Access Level</h4>
            <div className="space-y-3">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as ReviewerRole)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none cursor-pointer"
              >
                {REVIEWER_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <p className="text-sm text-black">{REVIEWER_ROLES.find((r) => r.value === selectedRole)?.description}</p>
              </div>
              <button
                onClick={handleUpdateRole}
                disabled={isUpdating}
                className="w-full px-4 py-2 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Updating...' : 'Update Access Level'}
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-xs font-bold text-red-600 uppercase tracking-wide mb-3">Danger Zone</h4>
            <button
              onClick={() => setShowRevokeConfirm(true)}
              disabled={isRevoking}
              className="w-full px-4 py-2 bg-red-50 border border-red-300 hover:bg-red-100 text-red-700 font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Ban className="w-4 h-4" />
              {isRevoking ? 'Revoking...' : 'Revoke Access'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              This will remove the reviewer&apos;s access to the CFP system. They will no longer be able to review
              submissions.
            </p>
          </div>
        </div>
      </div>

      {/* Revoke Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRevokeConfirm}
        onClose={() => setShowRevokeConfirm(false)}
        onConfirm={() => {
          onRevoke();
          setShowRevokeConfirm(false);
        }}
        title="Revoke Reviewer Access"
        message={`Are you sure you want to revoke access for ${reviewer.name || reviewer.email}? They will no longer be able to review submissions.`}
        confirmText="Revoke Access"
        confirmStyle="danger"
        isLoading={isRevoking}
      />
    </div>
  );
}
