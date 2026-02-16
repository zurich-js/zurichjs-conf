/**
 * CFP Submission Detail Page
 * View and manage a single submission
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { Check, X, MessageSquare, Loader2 } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Button, Heading } from '@/components/atoms';
import { createSupabaseServerClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { getSubmissionWithDetails, getSpeakerVisibleStatus, type SpeakerVisibleStatus } from '@/lib/cfp/submissions';
import type { CfpSpeaker, CfpSubmissionWithDetails } from '@/lib/types/cfp';

interface SubmissionDetailProps {
  speaker: CfpSpeaker;
  submission: CfpSubmissionWithDetails;
}

const StatusBadge = ({ status }: { status: SpeakerVisibleStatus }) => {
  const styles: Record<SpeakerVisibleStatus, string> = {
    draft: 'bg-gray-500/20 text-gray-300',
    submitted: 'bg-blue-500/20 text-blue-300',
    under_review: 'bg-purple-500/20 text-purple-300',
    accepted: 'bg-green-500/20 text-green-300',
    rejected: 'bg-red-500/20 text-red-300',
    withdrawn: 'bg-gray-500/20 text-gray-400',
  };

  const labels: Record<SpeakerVisibleStatus, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    under_review: 'Under Review',
    accepted: 'Accepted',
    rejected: 'Not Selected',
    withdrawn: 'Withdrawn',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const TYPE_LABELS: Record<string, string> = {
  lightning: 'Lightning Talk (15 min)',
  standard: 'Standard Talk (30 min)',
  workshop: 'Workshop',
};

export default function SubmissionDetail({ submission }: SubmissionDetailProps) {
  const router = useRouter();
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Feedback request state
  const [feedbackItems, setFeedbackItems] = useState<string[] | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const visibleStatus = getSpeakerVisibleStatus(submission);

  const isDraft = visibleStatus === 'draft';
  const canEdit = isDraft;
  const canSubmit = isDraft;
  const canWithdraw = visibleStatus === 'submitted';
  const canDelete = isDraft;
  const isAccepted = visibleStatus === 'accepted';
  const isRejected = visibleStatus === 'rejected';

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/cfp/submissions/${submission.id}/submit`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit');
      }

      router.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    setError(null);

    try {
      const response = await fetch(`/api/cfp/submissions/${submission.id}/withdraw`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to withdraw');
      }

      router.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsWithdrawing(false);
      setShowWithdrawConfirm(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/cfp/submissions/${submission.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }

      router.push('/cfp/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleConfirmAttendance = async (response: 'confirm' | 'decline') => {
    setIsConfirming(true);
    setError(null);

    try {
      const res = await fetch('/api/cfp/attendance/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submission.id,
          response,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update attendance');
      }

      router.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleRequestFeedback = async () => {
    setFeedbackLoading(true);
    setFeedbackError(null);

    try {
      const response = await fetch(`/api/cfp/submissions/${submission.id}/feedback`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch feedback');
      }

      const data = await response.json();
      setFeedbackItems(data.feedback || []);
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <>
      <SEO
        title={`${submission.title} | CFP`}
        description="View your CFP submission"
        noindex
      />

      <div className="min-h-screen bg-brand-gray-darkest">
        {/* Header */}
        <header className="border-b border-brand-gray-dark">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/cfp/dashboard" className="flex items-center gap-3">
              <img src="/images/logo/zurichjs-square.png" alt="ZurichJS" className="h-10 w-10" />
              <span className="text-white font-semibold">CFP</span>
            </Link>
            <Link
              href="/cfp/dashboard"
              className="text-brand-gray-light hover:text-white text-sm transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-red-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <StatusBadge status={visibleStatus} />
                <span className="text-brand-gray-light text-sm">
                  {TYPE_LABELS[submission.submission_type]}
                </span>
              </div>
              <Heading level="h1" className="text-2xl font-bold text-white">
                {submission.title}
              </Heading>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {canEdit && (
                <Link href={`/cfp/submissions/${submission.id}/edit`}>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </Link>
              )}
              {canSubmit && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  loading={isSubmitting}
                >
                  Submit for Review
                </Button>
              )}
              {canWithdraw && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWithdrawConfirm(true)}
                >
                  Withdraw
                </Button>
              )}
            </div>
          </div>

          {/* Acceptance Section */}
          {isAccepted && (
            <section className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-green-400 mb-2">
                    Your talk has been accepted!
                  </h2>
                  <p className="text-brand-gray-light text-sm mb-4">
                    Congratulations! Please confirm whether you can attend the conference to secure your speaking slot.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleConfirmAttendance('confirm')}
                      loading={isConfirming}
                    >
                      <Check className="w-4 h-4" />
                      Confirm Attendance
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConfirmAttendance('decline')}
                      disabled={isConfirming}
                    >
                      <X className="w-4 h-4" />
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Rejection Section */}
          {isRejected && (
            <section className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <X className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-red-400 mb-2">
                    Submission not selected
                  </h2>
                  <p className="text-brand-gray-light text-sm mb-4">
                    Thank you for your submission. Unfortunately, we were unable to include it in this year&apos;s program.
                    You can request feedback from the review committee below.
                  </p>

                  {feedbackItems === null ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRequestFeedback}
                      loading={feedbackLoading}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Request Feedback
                    </Button>
                  ) : feedbackItems.length > 0 ? (
                    <div className="space-y-3 mt-2">
                      <h3 className="text-sm font-medium text-white">Reviewer Feedback</h3>
                      {feedbackItems.map((item, i) => (
                        <div key={i} className="bg-brand-gray-darkest rounded-lg p-4">
                          <p className="text-brand-gray-light text-sm whitespace-pre-wrap">{item}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-brand-gray-medium text-sm italic">
                      No detailed feedback was provided for this submission.
                    </p>
                  )}

                  {feedbackError && (
                    <p className="text-red-400 text-sm mt-2">{feedbackError}</p>
                  )}

                  {feedbackLoading && (
                    <div className="flex items-center gap-2 text-brand-gray-light text-sm mt-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading feedback...
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Submission Content */}
          <div className="space-y-6">
            {/* Abstract */}
            <section className="bg-brand-gray-dark rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Abstract</h2>
              <p className="text-brand-gray-light whitespace-pre-wrap">{submission.abstract}</p>
            </section>

            {/* Details */}
            <section className="bg-brand-gray-dark rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Difficulty Level</h3>
                  <p className="text-white capitalize">{submission.talk_level}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Type</h3>
                  <p className="text-white">{TYPE_LABELS[submission.submission_type]}</p>
                </div>
                {submission.submitted_at && (
                  <div>
                    <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Submitted</h3>
                    <p className="text-white">
                      {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Created</h3>
                  <p className="text-white">
                    {new Date(submission.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </section>

            {/* Tags */}
            {submission.tags && submission.tags.length > 0 && (
              <section className="bg-brand-gray-dark rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {submission.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 bg-brand-gray-darkest text-brand-gray-light rounded-full text-sm"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Outline */}
            {submission.outline && (
              <section className="bg-brand-gray-dark rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Outline</h2>
                <p className="text-brand-gray-light whitespace-pre-wrap">{submission.outline}</p>
              </section>
            )}

            {/* Additional Notes */}
            {submission.additional_notes && (
              <section className="bg-brand-gray-dark rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Notes for Reviewers</h2>
                <p className="text-brand-gray-light whitespace-pre-wrap">{submission.additional_notes}</p>
              </section>
            )}

            {/* Workshop Details */}
            {submission.submission_type === 'workshop' && (
              <section className="bg-brand-gray-dark rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Workshop Details</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Duration</h3>
                    <p className="text-white">{submission.workshop_duration_hours} hours</p>
                  </div>
                  {submission.workshop_max_participants && (
                    <div>
                      <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Max Participants</h3>
                      <p className="text-white">{submission.workshop_max_participants}</p>
                    </div>
                  )}
                  {submission.workshop_expected_compensation && (
                    <div className="sm:col-span-2">
                      <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Expected Compensation</h3>
                      <p className="text-white">{submission.workshop_expected_compensation}</p>
                    </div>
                  )}
                  {submission.workshop_special_requirements && (
                    <div className="sm:col-span-2">
                      <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Special Requirements</h3>
                      <p className="text-brand-gray-light whitespace-pre-wrap">
                        {submission.workshop_special_requirements}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Travel */}
            <section className="bg-brand-gray-dark rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Travel</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Travel Assistance</h3>
                  <p className="text-white">
                    {submission.speaker?.travel_assistance_required ? (
                      submission.speaker.assistance_type === 'both' ? 'Travel & Accommodation needed' :
                      submission.speaker.assistance_type === 'travel' ? 'Travel needed' :
                      submission.speaker.assistance_type === 'accommodation' ? 'Accommodation needed' :
                      'Requested'
                    ) : 'Not needed'}
                  </p>
                </div>
                {submission.speaker?.departure_airport && (
                  <div>
                    <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Departure Airport</h3>
                    <p className="text-white">{submission.speaker.departure_airport}</p>
                  </div>
                )}
                {submission.speaker?.special_requirements && (
                  <div className="sm:col-span-2">
                    <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Special Requirements</h3>
                    <p className="text-brand-gray-light whitespace-pre-wrap">
                      {submission.speaker.special_requirements}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Links */}
            {(submission.slides_url || submission.previous_recording_url) && (
              <section className="bg-brand-gray-dark rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Links</h2>
                <div className="space-y-3">
                  {submission.slides_url && (
                    <a
                      href={submission.slides_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-brand-primary hover:underline"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Slides
                    </a>
                  )}
                  {submission.previous_recording_url && (
                    <a
                      href={submission.previous_recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-brand-primary hover:underline"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Previous Recording
                    </a>
                  )}
                </div>
              </section>
            )}

            {/* Danger Zone */}
            {canDelete && (
              <section className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
                <p className="text-brand-gray-light text-sm mb-4">
                  Delete this draft submission. This action cannot be undone.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border-red-500 text-red-400 hover:bg-red-500/20"
                >
                  Delete Submission
                </Button>
              </section>
            )}
          </div>
        </main>

        {/* Withdraw Confirmation Modal */}
        {showWithdrawConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-brand-gray-dark rounded-2xl p-6 max-w-md w-full">
              <h2 className="text-xl font-bold text-white mb-4">Withdraw Submission?</h2>
              <p className="text-brand-gray-light mb-6">
                Withdrawing will allow you to edit your submission again. You can resubmit it later.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowWithdrawConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleWithdraw}
                  loading={isWithdrawing}
                >
                  Withdraw
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-brand-gray-dark rounded-2xl p-6 max-w-md w-full">
              <h2 className="text-xl font-bold text-white mb-4">Delete Submission?</h2>
              <p className="text-brand-gray-light mb-6">
                This action cannot be undone. Your submission will be permanently deleted.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleDelete}
                  loading={isDeleting}
                  className="bg-red-500 hover:bg-red-600 border-red-500"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<SubmissionDetailProps> = async (ctx) => {
  const { id } = ctx.params || {};

  if (!id || typeof id !== 'string') {
    return { notFound: true };
  }

  const supabase = createSupabaseServerClient(ctx);

  // Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return {
      redirect: { destination: '/cfp/login', permanent: false },
    };
  }

  // Get speaker
  const speaker = await getSpeakerByUserId(session.user.id);

  if (!speaker) {
    return {
      redirect: { destination: '/cfp/login', permanent: false },
    };
  }

  // Get submission with details
  const submission = await getSubmissionWithDetails(id);

  if (!submission) {
    return { notFound: true };
  }

  // Verify ownership
  if (submission.speaker_id !== speaker.id) {
    return { notFound: true };
  }

  return {
    props: {
      speaker,
      submission,
    },
  };
};
