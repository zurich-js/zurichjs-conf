/**
 * Schedule Email Modal Component
 * Modal for scheduling acceptance or rejection emails to speakers
 * Emails are scheduled with a 30-minute delay to allow cancellation
 */

import { useState, useEffect } from 'react';
import { Mail, Clock, Gift, MessageSquare, AlertTriangle, Loader2 } from 'lucide-react';
import { AdminModal, AdminModalFooter } from '../AdminModal';
import type { CfpAdminSubmission } from '@/lib/types/cfp-admin';
import type { CfpScheduledEmail } from '@/lib/types/cfp/decisions';
import { REJECTION_COUPON } from '@/lib/cfp/config';

interface ScheduleEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: CfpAdminSubmission | null;
  emailType: 'acceptance' | 'rejection';
  existingScheduledEmail?: CfpScheduledEmail | null;
  committeeFeedback?: string | null;
  onSchedule: (
    submissionId: string,
    options: {
      email_type: 'acceptance' | 'rejection';
      personal_message?: string;
      coupon_discount_percent?: number;
      coupon_validity_days?: number;
      include_feedback?: boolean;
      feedback_text?: string;
    }
  ) => Promise<void>;
  isLoading?: boolean;
}

export function ScheduleEmailModal({
  isOpen,
  onClose,
  submission,
  emailType,
  existingScheduledEmail,
  committeeFeedback,
  onSchedule,
  isLoading = false,
}: ScheduleEmailModalProps) {
  const [personalMessage, setPersonalMessage] = useState('');
  const [generateCoupon, setGenerateCoupon] = useState(true);
  const [couponDiscount, setCouponDiscount] = useState<number>(REJECTION_COUPON.DEFAULT_DISCOUNT_PERCENT);
  const [couponValidityDays, setCouponValidityDays] = useState<number>(REJECTION_COUPON.DEFAULT_VALIDITY_DAYS);
  const [includeFeedback, setIncludeFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  // Initialize feedback text from committee feedback
  useEffect(() => {
    if (committeeFeedback) {
      setFeedbackText(committeeFeedback);
    }
  }, [committeeFeedback]);

  if (!submission) return null;

  const handleSubmit = async () => {
    await onSchedule(submission.id, {
      email_type: emailType,
      personal_message: personalMessage || undefined,
      coupon_discount_percent: emailType === 'rejection' && generateCoupon ? couponDiscount : undefined,
      coupon_validity_days: emailType === 'rejection' && generateCoupon ? couponValidityDays : undefined,
      include_feedback: emailType === 'rejection' && includeFeedback ? true : undefined,
      feedback_text: emailType === 'rejection' && includeFeedback ? feedbackText : undefined,
    });

    // Reset form
    setPersonalMessage('');
    setGenerateCoupon(true);
    setCouponDiscount(REJECTION_COUPON.DEFAULT_DISCOUNT_PERCENT);
    setCouponValidityDays(REJECTION_COUPON.DEFAULT_VALIDITY_DAYS);
    setIncludeFeedback(false);
    setFeedbackText(committeeFeedback || '');
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const isAcceptance = emailType === 'acceptance';
  const speakerName = submission.speaker
    ? `${submission.speaker.first_name} ${submission.speaker.last_name}`
    : 'Unknown Speaker';

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isAcceptance ? 'Schedule Acceptance Email' : 'Schedule Rejection Email'}
      subtitle={submission.title}
      size="lg"
      footer={
        <AdminModalFooter
          onCancel={handleClose}
          onConfirm={handleSubmit}
          cancelText="Cancel"
          confirmText="Schedule Email"
          isLoading={isLoading}
          variant={isAcceptance ? 'primary' : 'danger'}
        />
      }
    >
      <div className="space-y-6">
        {/* Warning if email already scheduled */}
        {existingScheduledEmail && existingScheduledEmail.status === 'pending' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                An email is already scheduled
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Scheduled for:{' '}
                {new Date(existingScheduledEmail.scheduled_for).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Scheduling info */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              30-minute delay for review
            </p>
            <p className="text-sm text-blue-700 mt-1">
              The email will be scheduled to send in 30 minutes. You can cancel
              it anytime before it sends.
            </p>
          </div>
        </div>

        {/* Recipient info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Mail className="w-4 h-4" />
            <span>Sending to:</span>
          </div>
          <p className="font-medium text-black">{speakerName}</p>
          <p className="text-sm text-gray-500">
            {submission.speaker?.email || 'No email available'}
          </p>
        </div>

        {/* Personal Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>Personal Message (optional)</span>
            </div>
          </label>
          <textarea
            value={personalMessage}
            onChange={(e) => setPersonalMessage(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={
              isAcceptance
                ? "We're excited to have you speak! Your topic on..."
                : "Thank you for your submission. We had many strong proposals this year..."
            }
          />
          <p className="text-xs text-gray-500 mt-1">
            This message will be included in the email to add a personal touch.
          </p>
        </div>

        {/* Rejection-specific options */}
        {!isAcceptance && (
          <>
            {/* Coupon Section */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 p-3 bg-gray-50 border-b border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={generateCoupon}
                    onChange={(e) => setGenerateCoupon(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Gift className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Include discount coupon
                  </span>
                </label>
              </div>

              {generateCoupon && (
                <div className="p-3 space-y-4">
                  {/* Discount percentage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Percentage
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={REJECTION_COUPON.MIN_DISCOUNT_PERCENT}
                        max={REJECTION_COUPON.MAX_DISCOUNT_PERCENT}
                        step="5"
                        value={couponDiscount}
                        onChange={(e) => setCouponDiscount(Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="w-12 text-center font-medium text-gray-900">
                        {couponDiscount}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Max {REJECTION_COUPON.MAX_DISCOUNT_PERCENT}% discount
                    </p>
                  </div>

                  {/* Validity period */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Coupon Valid For
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={REJECTION_COUPON.MIN_VALIDITY_DAYS}
                        max={REJECTION_COUPON.MAX_VALIDITY_DAYS}
                        step="1"
                        value={couponValidityDays}
                        onChange={(e) => setCouponValidityDays(Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="w-20 text-center font-medium text-gray-900">
                        {couponValidityDays} {couponValidityDays === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {REJECTION_COUPON.MIN_VALIDITY_DAYS}-{REJECTION_COUPON.MAX_VALIDITY_DAYS} days validity
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Committee Feedback Section */}
            {committeeFeedback && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 p-3 bg-gray-50 border-b border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={includeFeedback}
                      onChange={(e) => setIncludeFeedback(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      Include committee feedback
                    </span>
                  </label>
                </div>

                {includeFeedback && (
                  <div className="p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Feedback to include (you can edit)
                    </label>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Committee feedback..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This feedback will be shown in the email to help the speaker improve.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Scheduling email...</span>
            </div>
          </div>
        )}
      </div>
    </AdminModal>
  );
}

/**
 * Scheduled Email Status Badge
 */
export function ScheduledEmailBadge({
  scheduledEmail,
}: {
  scheduledEmail: CfpScheduledEmail | null | undefined;
}) {
  if (!scheduledEmail) {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
        Not sent
      </span>
    );
  }

  if (scheduledEmail.status === 'pending') {
    const scheduledTime = new Date(scheduledEmail.scheduled_for);
    const timeLeft = scheduledTime.getTime() - Date.now();
    const minutesLeft = Math.max(0, Math.ceil(timeLeft / 60000));

    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 inline-flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Sending in {minutesLeft}m
      </span>
    );
  }

  if (scheduledEmail.status === 'sent') {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
        Sent
      </span>
    );
  }

  if (scheduledEmail.status === 'cancelled') {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
        Cancelled
      </span>
    );
  }

  if (scheduledEmail.status === 'failed') {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">
        Failed
      </span>
    );
  }

  return null;
}
