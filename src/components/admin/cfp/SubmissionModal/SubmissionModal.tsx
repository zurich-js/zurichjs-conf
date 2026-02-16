/**
 * Submission Modal Component
 * Displays full submission details with review scores and status actions
 */

import React, { useState, useMemo } from 'react';
import { X, FileText, Copy, Mail, Pencil, Loader2, Gavel } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import type { CfpAdminSubmission, CfpReviewWithReviewer } from '@/lib/types/cfp-admin';
import { cfpQueryKeys } from '@/lib/types/cfp-admin';
import {
  fetchSubmissionDetail,
  fetchDecisionData,
  makeDecision,
  scheduleEmail,
  cancelScheduledEmail,
  sendEmailNow,
} from '@/lib/cfp/adminApi';
import { StatusBadge } from '../StatusBadge';
import { ConfirmationModal } from '../ConfirmationModal';
import { DecisionModal } from '../DecisionModal';
import { ScheduleEmailModal } from '../ScheduleEmailModal';
import { SubmissionEditForm } from './SubmissionEditForm';
import { SpeakerInfoSection } from './SpeakerInfoSection';
import { ReviewsSection } from './ReviewsSection';
import { StatusActionsSection } from './StatusActionsSection';
import { CommunicationSection } from './CommunicationSection';

export interface SubmissionModalProps {
  submission: CfpAdminSubmission;
  onClose: () => void;
  onUpdateStatus: (status: string) => void;
  isUpdating: boolean;
  onDelete: () => void;
  isDeleting: boolean;
  onEdit: (data: Partial<CfpAdminSubmission>) => void;
  isEditing: boolean;
}

export function SubmissionModal({
  submission,
  onClose,
  onUpdateStatus,
  isUpdating,
  onDelete,
  isDeleting,
  onEdit,
  isEditing,
}: SubmissionModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showScheduleEmailModal, setShowScheduleEmailModal] = useState(false);
  const [scheduleEmailType, setScheduleEmailType] = useState<'acceptance' | 'rejection'>('acceptance');
  const [editForm, setEditForm] = useState({
    title: submission.title,
    abstract: submission.abstract,
    submission_type: submission.submission_type,
    talk_level: submission.talk_level,
    workshop_duration_hours: submission.workshop_duration_hours,
    workshop_expected_compensation: submission.workshop_expected_compensation,
    workshop_compensation_amount: submission.workshop_compensation_amount,
    workshop_special_requirements: submission.workshop_special_requirements,
    workshop_max_participants: submission.workshop_max_participants,
  });

  // Fetch reviews via TanStack Query
  const { data: detailData, isLoading: isLoadingReviews } = useQuery({
    queryKey: cfpQueryKeys.submissionDetail(submission.id),
    queryFn: () => fetchSubmissionDetail(submission.id),
  });
  const reviews = detailData?.reviews ?? [];

  // Fetch decision data (status + scheduled emails)
  const { data: decisionData } = useQuery({
    queryKey: cfpQueryKeys.decisionData(submission.id),
    queryFn: () => fetchDecisionData(submission.id),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.scheduled_emails?.some((e) => e.status === 'pending') ? 30000 : false;
    },
  });

  const decisionStatus = decisionData?.status?.decision_status;
  const scheduledEmails = decisionData?.scheduled_emails ?? [];

  // Decision mutation
  const decisionMutation = useMutation({
    mutationFn: ({ decision, notes }: { decision: 'accepted' | 'rejected'; notes?: string }) =>
      makeDecision(submission.id, decision, notes),
    onSuccess: (_, { decision }) => {
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.decisionData(submission.id) });
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.submissions() });
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.stats });
      toast.success(`Submission ${decision}`);
      setShowDecisionModal(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Schedule email mutation
  const scheduleEmailMutation = useMutation({
    mutationFn: (options: Parameters<typeof scheduleEmail>[1]) =>
      scheduleEmail(submission.id, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.decisionData(submission.id) });
      toast.success('Email scheduled');
      setShowScheduleEmailModal(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Cancel email mutation
  const cancelEmailMutation = useMutation({
    mutationFn: (emailId: string) => cancelScheduledEmail(submission.id, emailId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.decisionData(submission.id) });
      toast.success('Scheduled email cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Send now mutation
  const sendNowMutation = useMutation({
    mutationFn: (emailId: string) => sendEmailNow(submission.id, emailId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.decisionData(submission.id) });
      toast.success('Email sent');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleDecision = async (
    _submissionId: string,
    decision: 'accepted' | 'rejected',
    options: { notes?: string }
  ) => {
    await decisionMutation.mutateAsync({ decision, notes: options.notes });
  };

  const handleScheduleEmail = async (
    _submissionId: string,
    options: Parameters<typeof scheduleEmail>[1]
  ) => {
    await scheduleEmailMutation.mutateAsync(options);
  };

  const handleCancelScheduledEmail = async (emailId: string) => {
    await cancelEmailMutation.mutateAsync(emailId);
  };

  const handleSendNow = async (emailId: string) => {
    await sendNowMutation.mutateAsync(emailId);
  };

  const aggregateScores = useMemo(() => {
    if (reviews.length === 0) return null;

    const calcAvg = (getter: (r: CfpReviewWithReviewer) => number | null) => {
      const values = reviews.map(getter).filter((v): v is number => v !== null);
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
    };

    return {
      overall: calcAvg((r) => r.score_overall),
      relevance: calcAvg((r) => r.score_relevance),
      technical_depth: calcAvg((r) => r.score_technical_depth),
      clarity: calcAvg((r) => r.score_clarity),
      diversity: calcAvg((r) => r.score_diversity),
    };
  }, [reviews]);

  const copyEmail = () => {
    navigator.clipboard.writeText(submission.speaker?.email || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    onEdit(editForm);
    setIsEditMode(false);
  };

  const handleCancelEdit = () => {
    setEditForm({
      title: submission.title,
      abstract: submission.abstract,
      submission_type: submission.submission_type,
      talk_level: submission.talk_level,
      workshop_duration_hours: submission.workshop_duration_hours,
      workshop_expected_compensation: submission.workshop_expected_compensation,
      workshop_compensation_amount: submission.workshop_compensation_amount,
      workshop_special_requirements: submission.workshop_special_requirements,
      workshop_max_participants: submission.workshop_max_participants,
    });
    setIsEditMode(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#F1E271] rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-black" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-black">Submission Details</h3>
                <p className="text-sm text-black mt-0.5">
                  {submission.speaker?.first_name} {submission.speaker?.last_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 text-black" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Status and Quick Actions Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={submission.status} />
              <span className="px-2 py-1 bg-gray-100 rounded text-xs text-black font-medium capitalize">
                {submission.submission_type}
              </span>
              <span className="px-2 py-1 bg-gray-100 rounded text-xs text-black font-medium capitalize">
                {submission.talk_level}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyEmail}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-black hover:bg-gray-50 transition-all cursor-pointer"
              >
                <Copy className="w-4 h-4 mr-1.5" />
                {copied ? 'Copied!' : 'Copy Email'}
              </button>
              <a
                href={`mailto:${submission.speaker?.email}?subject=Re: ${encodeURIComponent(submission.title)}`}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-black hover:bg-gray-50 transition-all cursor-pointer"
              >
                <Mail className="w-4 h-4 mr-1.5" />
                Email Speaker
              </a>
            </div>
          </div>

          {/* Submission Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-black uppercase tracking-wide">Talk Information</h4>
              {!isEditMode && (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
              )}
            </div>
            {isEditMode ? (
              <SubmissionEditForm
                editForm={editForm}
                setEditForm={setEditForm}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
                isEditing={isEditing}
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-black font-semibold mb-1">Title</p>
                  <p className="text-base text-black font-medium">{submission.title}</p>
                </div>
                <div>
                  <p className="text-xs text-black font-semibold mb-1">Abstract</p>
                  <p className="text-sm text-black whitespace-pre-wrap leading-relaxed">{submission.abstract}</p>
                </div>
                {submission.tags && submission.tags.length > 0 && (
                  <div>
                    <p className="text-xs text-black font-semibold mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {submission.tags.map((tag) => (
                        <span key={tag.id} className="px-2 py-0.5 bg-[#F1E271] rounded text-xs text-black font-medium">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Workshop details in view mode */}
                {submission.submission_type === 'workshop' && (
                  <div className="pt-3 border-t border-gray-200 mt-3">
                    <p className="text-xs font-bold text-black uppercase tracking-wide mb-2">Workshop Details</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {submission.workshop_duration_hours && (
                        <div>
                          <p className="text-xs text-gray-500">Duration</p>
                          <p className="text-sm font-medium text-black">{submission.workshop_duration_hours} hours</p>
                        </div>
                      )}
                      {submission.workshop_max_participants && (
                        <div>
                          <p className="text-xs text-gray-500">Max Participants</p>
                          <p className="text-sm font-medium text-black">{submission.workshop_max_participants}</p>
                        </div>
                      )}
                      {submission.workshop_expected_compensation && (
                        <div>
                          <p className="text-xs text-gray-500">Compensation</p>
                          <p className="text-sm font-medium text-black capitalize">
                            {submission.workshop_expected_compensation.replace('_', ' ')}
                          </p>
                        </div>
                      )}
                      {submission.workshop_compensation_amount != null && (
                        <div>
                          <p className="text-xs text-gray-500">Amount</p>
                          <p className="text-sm font-medium text-black">CHF {submission.workshop_compensation_amount}</p>
                        </div>
                      )}
                    </div>
                    {submission.workshop_special_requirements && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500">Special Requirements</p>
                        <p className="text-sm text-black whitespace-pre-wrap">{submission.workshop_special_requirements}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Speaker Info */}
          <SpeakerInfoSection speaker={submission.speaker} />

          {/* Review Stats */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-3">Review Statistics</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-black font-semibold mb-1">Reviews</p>
                <p className="text-2xl font-bold text-black">{submission.stats?.review_count || 0}</p>
              </div>
              <div>
                <p className="text-xs text-black font-semibold mb-1">Average Score</p>
                <p className="text-2xl font-bold text-black">
                  {submission.stats?.avg_overall ? submission.stats.avg_overall.toFixed(2) : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-black font-semibold mb-1">Submitted</p>
                <p className="text-sm text-black">
                  {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : 'Draft'}
                </p>
              </div>
              <div>
                <p className="text-xs text-black font-semibold mb-1">Created</p>
                <p className="text-sm text-black">{new Date(submission.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Committee Reviews */}
          <ReviewsSection
            reviews={reviews}
            isLoading={isLoadingReviews}
            aggregateScores={aggregateScores}
          />

          {/* Decision & Communication */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-black uppercase tracking-wide flex items-center gap-2">
                <Gavel className="w-4 h-4 text-gray-600" />
                Decision & Communication
              </h4>
              <button
                onClick={() => setShowDecisionModal(true)}
                className="px-3 py-1.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Make Decision
              </button>
            </div>
            <CommunicationSection
              decisionStatus={decisionStatus}
              scheduledEmails={scheduledEmails}
              onScheduleAcceptance={() => {
                setScheduleEmailType('acceptance');
                setShowScheduleEmailModal(true);
              }}
              onScheduleRejection={() => {
                setScheduleEmailType('rejection');
                setShowScheduleEmailModal(true);
              }}
              onCancelScheduledEmail={handleCancelScheduledEmail}
              onSendNow={handleSendNow}
              isCancelling={cancelEmailMutation.isPending}
              isSendingNow={sendNowMutation.isPending}
            />
          </div>

          {/* Status Actions */}
          <StatusActionsSection
            currentStatus={submission.status}
            onUpdateStatus={onUpdateStatus}
            isUpdating={isUpdating}
          />

          {/* Danger Zone */}
          <div className="border-t border-red-200 pt-6 mt-6">
            <h4 className="text-xs font-bold text-red-600 uppercase tracking-wide mb-4">Danger Zone</h4>
            <div className="flex flex-col">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-50 border border-red-300 hover:bg-red-100 text-red-700 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Delete Submission
              </button>
              <p className="text-xs text-red-500 mt-1 max-w-[300px]">
                Permanently delete this submission and all associated reviews. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete();
          setShowDeleteConfirm(false);
        }}
        title="Delete Submission"
        message={`Are you sure you want to delete "${submission.title}"? This will also delete all associated reviews. This action cannot be undone.`}
        confirmText="Delete Submission"
        confirmStyle="danger"
        isLoading={isDeleting}
      />

      {/* Decision Modal */}
      <DecisionModal
        isOpen={showDecisionModal}
        onClose={() => setShowDecisionModal(false)}
        submission={submission}
        onDecision={handleDecision}
        isLoading={decisionMutation.isPending}
      />

      {/* Schedule Email Modal */}
      <ScheduleEmailModal
        isOpen={showScheduleEmailModal}
        onClose={() => setShowScheduleEmailModal(false)}
        submission={submission}
        emailType={scheduleEmailType}
        existingScheduledEmail={scheduledEmails.find(
          (e) => e.email_type === scheduleEmailType && e.status === 'pending'
        )}
        onSchedule={handleScheduleEmail}
        isLoading={scheduleEmailMutation.isPending}
      />
    </div>
  );
}
