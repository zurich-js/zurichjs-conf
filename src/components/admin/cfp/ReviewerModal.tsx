/**
 * Reviewer Modal Component
 * Manage individual reviewer access and permissions
 */

import { useState } from 'react';
import { User, Ban } from 'lucide-react';
import type { CfpAdminReviewer, ReviewerRole } from '@/lib/types/cfp-admin';
import { Modal, ModalBody, Select } from '@/components/atoms';
import { ConfirmationModal } from './ConfirmationModal';

const REVIEWER_ROLE_OPTIONS = [
  {
    value: 'full_access' as const,
    label: 'Full Access',
    description: 'Can see speaker names, emails, and all details. Can score and leave feedback.',
  },
  {
    value: 'anonymous' as const,
    label: 'Anonymous Review',
    description: 'Cannot see speaker names or personal details. Can score submissions blindly.',
  },
  {
    value: 'readonly' as const,
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

  const selectedRoleInfo = REVIEWER_ROLE_OPTIONS.find((r) => r.value === selectedRole);

  const headerContent = (
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center">
        <User className="w-5 h-5 text-black" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-black">Manage Reviewer</h3>
        <p className="text-sm text-gray-600">{reviewer.email}</p>
      </div>
    </div>
  );

  return (
    <>
      <Modal isOpen={true} onClose={onClose} headerContent={headerContent} size="lg">
        <ModalBody className="space-y-6">
          {/* Reviewer Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Name</p>
                <p className="text-sm text-black font-medium">{reviewer.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Status</p>
                <p className="text-sm">
                  {reviewer.accepted_at ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                      Pending Invite
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Current Role</p>
                <p className="text-sm text-black font-medium capitalize">
                  {reviewer.role.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Invited</p>
                <p className="text-sm text-black">
                  {new Date(reviewer.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Change Access Level */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
              Change Access Level
            </h4>
            <div className="space-y-3">
              <Select
                value={selectedRole}
                onChange={(value) => setSelectedRole(value as ReviewerRole)}
                options={REVIEWER_ROLE_OPTIONS}
              />
              {selectedRoleInfo && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <p className="text-sm text-gray-700">{selectedRoleInfo.description}</p>
                </div>
              )}
              <button
                onClick={handleUpdateRole}
                disabled={isUpdating}
                className="w-full px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-black font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Updating...' : 'Update Access Level'}
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-xs font-bold text-red-600 uppercase tracking-wide mb-3">
              Danger Zone
            </h4>
            <button
              onClick={() => setShowRevokeConfirm(true)}
              disabled={isRevoking}
              className="w-full px-4 py-2 bg-red-50 border border-red-300 hover:bg-red-100 text-red-700 font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Ban className="w-4 h-4" />
              {isRevoking ? 'Revoking...' : 'Revoke Access'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              This will remove the reviewer&apos;s access to the CFP system. They will no longer be
              able to review submissions.
            </p>
          </div>
        </ModalBody>
      </Modal>

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
    </>
  );
}
