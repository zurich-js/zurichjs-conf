/**
 * Communication Section Component
 * Displays email communication status and actions for a submission
 * Separate from decision-making (status changes)
 */

import { useState } from 'react';
import { Mail, Clock, Send, XCircle, Check, X, AlertTriangle, Loader2, Zap } from 'lucide-react';
import type { CfpDecisionStatus } from '@/lib/types/cfp';
import type { CfpScheduledEmail } from '@/lib/types/cfp/decisions';
import { DecisionBadge } from '../DecisionModal';

interface CommunicationSectionProps {
  decisionStatus: CfpDecisionStatus | undefined;
  scheduledEmails: CfpScheduledEmail[];
  onScheduleAcceptance: () => void;
  onScheduleRejection: () => void;
  onCancelScheduledEmail: (scheduledEmailId: string) => Promise<void>;
  onSendNow?: (scheduledEmailId: string) => Promise<void>;
  isCancelling?: boolean;
  isSendingNow?: boolean;
}

export function CommunicationSection({
  decisionStatus,
  scheduledEmails,
  onScheduleAcceptance,
  onScheduleRejection,
  onCancelScheduledEmail,
  onSendNow,
  isCancelling = false,
  isSendingNow = false,
}: CommunicationSectionProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [sendingNowId, setSendingNowId] = useState<string | null>(null);
  const [confirmSendNow, setConfirmSendNow] = useState<string | null>(null);

  const pendingAcceptanceEmail = scheduledEmails.find(
    (e) => e.email_type === 'acceptance' && e.status === 'pending'
  );
  const pendingRejectionEmail = scheduledEmails.find(
    (e) => e.email_type === 'rejection' && e.status === 'pending'
  );
  const sentAcceptanceEmail = scheduledEmails.find(
    (e) => e.email_type === 'acceptance' && e.status === 'sent'
  );
  const sentRejectionEmail = scheduledEmails.find(
    (e) => e.email_type === 'rejection' && e.status === 'sent'
  );

  const handleCancel = async (emailId: string) => {
    setCancellingId(emailId);
    try {
      await onCancelScheduledEmail(emailId);
    } finally {
      setCancellingId(null);
    }
  };

  const handleSendNow = async (emailId: string) => {
    if (!onSendNow) return;
    setSendingNowId(emailId);
    try {
      await onSendNow(emailId);
      setConfirmSendNow(null);
    } finally {
      setSendingNowId(null);
    }
  };

  const hasDecision = decisionStatus === 'accepted' || decisionStatus === 'rejected';
  const isAccepted = decisionStatus === 'accepted';
  const isRejected = decisionStatus === 'rejected';

  // Calculate time remaining for pending emails
  const getTimeRemaining = (scheduledFor: string) => {
    const scheduledTime = new Date(scheduledFor).getTime();
    const now = Date.now();
    const timeLeft = scheduledTime - now;
    if (timeLeft <= 0) return 'Sending now...';
    const minutes = Math.ceil(timeLeft / 60000);
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  };

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-4 h-4 text-gray-600" />
        <h4 className="text-xs font-bold text-black uppercase tracking-wide">Communication</h4>
      </div>

      {/* Decision Status */}
      <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Decision Status:</span>
          <DecisionBadge status={decisionStatus} size="md" />
        </div>
      </div>

      {/* No decision yet */}
      {!hasDecision && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">No decision made yet</p>
              <p className="text-sm text-amber-700 mt-1">
                Make a decision (Accept or Reject) before scheduling an email to the speaker.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Acceptance Email Section */}
      {isAccepted && (
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            Acceptance Email
          </h5>

          {sentAcceptanceEmail ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Email sent</span>
              </div>
              <p className="text-xs text-green-700 mt-1">
                Sent on {new Date(sentAcceptanceEmail.sent_at!).toLocaleString()}
              </p>
            </div>
          ) : pendingAcceptanceEmail ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-800">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Scheduled - sending in {getTimeRemaining(pendingAcceptanceEmail.scheduled_for)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {confirmSendNow === pendingAcceptanceEmail.id ? (
                    <>
                      <span className="text-xs text-amber-800">Send now?</span>
                      <button
                        onClick={() => handleSendNow(pendingAcceptanceEmail.id)}
                        disabled={isSendingNow || sendingNowId === pendingAcceptanceEmail.id}
                        className="px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {sendingNowId === pendingAcceptanceEmail.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                      </button>
                      <button
                        onClick={() => setConfirmSendNow(null)}
                        className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 cursor-pointer"
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <>
                      {onSendNow && (
                        <button
                          onClick={() => setConfirmSendNow(pendingAcceptanceEmail.id)}
                          className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3" />
                          Send Now
                        </button>
                      )}
                      <button
                        onClick={() => handleCancel(pendingAcceptanceEmail.id)}
                        disabled={isCancelling || cancellingId === pendingAcceptanceEmail.id}
                        className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                      >
                        {cancellingId === pendingAcceptanceEmail.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Scheduled for {new Date(pendingAcceptanceEmail.scheduled_for).toLocaleString()}
              </p>
            </div>
          ) : (
            <button
              onClick={onScheduleAcceptance}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Schedule Acceptance Email
            </button>
          )}
        </div>
      )}

      {/* Rejection Email Section */}
      {isRejected && (
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <X className="w-4 h-4 text-red-600" />
            Rejection Email
          </h5>

          {sentRejectionEmail ? (
            <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 text-gray-700">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Email sent</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Sent on {new Date(sentRejectionEmail.sent_at!).toLocaleString()}
              </p>
              {sentRejectionEmail.coupon_code && (
                <p className="text-xs text-gray-600 mt-1">
                  Coupon included: {sentRejectionEmail.coupon_code} ({sentRejectionEmail.coupon_discount_percent}% off)
                </p>
              )}
            </div>
          ) : pendingRejectionEmail ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-800">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Scheduled - sending in {getTimeRemaining(pendingRejectionEmail.scheduled_for)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {confirmSendNow === pendingRejectionEmail.id ? (
                    <>
                      <span className="text-xs text-amber-800">Send now?</span>
                      <button
                        onClick={() => handleSendNow(pendingRejectionEmail.id)}
                        disabled={isSendingNow || sendingNowId === pendingRejectionEmail.id}
                        className="px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {sendingNowId === pendingRejectionEmail.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                      </button>
                      <button
                        onClick={() => setConfirmSendNow(null)}
                        className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 cursor-pointer"
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <>
                      {onSendNow && (
                        <button
                          onClick={() => setConfirmSendNow(pendingRejectionEmail.id)}
                          className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3" />
                          Send Now
                        </button>
                      )}
                      <button
                        onClick={() => handleCancel(pendingRejectionEmail.id)}
                        disabled={isCancelling || cancellingId === pendingRejectionEmail.id}
                        className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                      >
                        {cancellingId === pendingRejectionEmail.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Scheduled for {new Date(pendingRejectionEmail.scheduled_for).toLocaleString()}
              </p>
              {pendingRejectionEmail.coupon_code && (
                <p className="text-xs text-amber-700 mt-1">
                  Coupon: {pendingRejectionEmail.coupon_code} ({pendingRejectionEmail.coupon_discount_percent}% off)
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={onScheduleRejection}
              className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Schedule Rejection Email
            </button>
          )}
        </div>
      )}

      {/* Email History */}
      {scheduledEmails.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">Email History</h5>
          <div className="space-y-2">
            {scheduledEmails
              .filter((e) => e.status !== 'pending')
              .map((email) => (
                <div
                  key={email.id}
                  className="flex items-center justify-between text-xs text-gray-600 py-1"
                >
                  <span className="capitalize">
                    {email.email_type} email
                  </span>
                  <span className="flex items-center gap-2">
                    <EmailStatusBadge status={email.status} />
                    {email.sent_at && (
                      <span>{new Date(email.sent_at).toLocaleDateString()}</span>
                    )}
                    {email.cancelled_at && (
                      <span>{new Date(email.cancelled_at).toLocaleDateString()}</span>
                    )}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmailStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'sent':
      return (
        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">
          Sent
        </span>
      );
    case 'cancelled':
      return (
        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
          Cancelled
        </span>
      );
    case 'failed':
      return (
        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">
          Failed
        </span>
      );
    default:
      return null;
  }
}
