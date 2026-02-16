/**
 * Decision Modal Component
 * Modal for accepting or rejecting CFP submissions
 *
 * NOTE: This modal only handles the decision (status change).
 * Email communication is handled separately via ScheduleEmailModal.
 */

import { useState } from 'react';
import { Check, X, Loader2, Info } from 'lucide-react';
import { AdminModal, AdminModalFooter } from '../AdminModal';
import type { CfpAdminSubmission } from '@/lib/types/cfp-admin';
import type { CfpDecisionStatus } from '@/lib/types/cfp';

interface DecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: CfpAdminSubmission | null;
  onDecision: (
    submissionId: string,
    decision: 'accepted' | 'rejected',
    options: {
      notes?: string;
    }
  ) => Promise<void>;
  isLoading?: boolean;
}

export function DecisionModal({
  isOpen,
  onClose,
  submission,
  onDecision,
  isLoading = false,
}: DecisionModalProps) {
  const [decision, setDecision] = useState<'accepted' | 'rejected' | null>(null);
  const [notes, setNotes] = useState('');

  if (!submission) return null;

  const handleSubmit = async () => {
    if (!decision) return;

    await onDecision(submission.id, decision, {
      notes: notes || undefined,
    });

    // Reset form
    setDecision(null);
    setNotes('');
  };

  const handleClose = () => {
    if (!isLoading) {
      setDecision(null);
      setNotes('');
      onClose();
    }
  };

  const currentDecision = (submission as unknown as { decision_status?: CfpDecisionStatus }).decision_status;
  const isAlreadyDecided = currentDecision === 'accepted' || currentDecision === 'rejected';

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Make Decision"
      subtitle={submission.title}
      size="lg"
      footer={
        decision && (
          <AdminModalFooter
            onCancel={handleClose}
            onConfirm={handleSubmit}
            cancelText="Cancel"
            confirmText={decision === 'accepted' ? 'Accept Talk' : 'Reject Talk'}
            isLoading={isLoading}
            disabled={!decision}
            variant={decision === 'rejected' ? 'danger' : 'primary'}
          />
        )
      }
    >
      <div className="space-y-6">
        {/* Warning if already decided */}
        {isAlreadyDecided && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              This submission has already been{' '}
              <strong>{currentDecision}</strong>. Making a new decision will
              update the status.
            </p>
          </div>
        )}

        {/* Submission Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-black">{submission.title}</h4>
          <p className="text-sm text-gray-600 mt-1">
            by {submission.speaker ? `${submission.speaker.first_name} ${submission.speaker.last_name}` : 'Unknown Speaker'}
          </p>
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
              {submission.submission_type}
            </span>
            {submission.stats?.avg_overall && (
              <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
                Score: {submission.stats.avg_overall.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Decision Buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Decision
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDecision('accepted')}
              disabled={isLoading}
              className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                decision === 'accepted'
                  ? 'border-green-500 bg-green-50 text-green-800'
                  : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
              }`}
            >
              <Check className="w-5 h-5" />
              <span className="font-medium">Accept</span>
            </button>
            <button
              onClick={() => setDecision('rejected')}
              disabled={isLoading}
              className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                decision === 'rejected'
                  ? 'border-red-500 bg-red-50 text-red-800'
                  : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
              }`}
            >
              <X className="w-5 h-5" />
              <span className="font-medium">Reject</span>
            </button>
          </div>
        </div>

        {/* Options based on decision */}
        {decision && (
          <>
            {/* Internal Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Internal Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Internal notes for the committee (not sent to speaker)..."
              />
            </div>

            {/* Info about email */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                This will only update the decision status. To notify the speaker,
                use the <strong>Communication</strong> section after saving
                to schedule an email.
              </p>
            </div>
          </>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing decision...</span>
            </div>
          </div>
        )}
      </div>
    </AdminModal>
  );
}

/**
 * Decision Badge Component
 * Displays the decision status of a submission
 */
export function DecisionBadge({
  status,
  size = 'sm',
}: {
  status: CfpDecisionStatus | undefined;
  size?: 'sm' | 'md';
}) {
  const baseClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  if (status === 'accepted') {
    return (
      <span className={`${baseClasses} inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 font-medium`}>
        <Check className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        Accepted
      </span>
    );
  }

  if (status === 'rejected') {
    return (
      <span className={`${baseClasses} inline-flex items-center gap-1 rounded-full bg-red-100 text-red-800 font-medium`}>
        <X className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        Rejected
      </span>
    );
  }

  return (
    <span className={`${baseClasses} inline-flex items-center rounded-full bg-gray-100 text-gray-600 font-medium`}>
      Undecided
    </span>
  );
}
