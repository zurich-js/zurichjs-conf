/**
 * CFP Submission Detail Page
 * View and manage a single submission
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { SEO } from '@/components/SEO';
import { Button, Heading } from '@/components/atoms';
import { createSupabaseServerClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { getSubmissionWithDetails } from '@/lib/cfp/submissions';
import type { CfpSpeaker, CfpSubmissionWithDetails } from '@/lib/types/cfp';

interface SubmissionDetailProps {
  speaker: CfpSpeaker;
  submission: CfpSubmissionWithDetails;
}

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    draft: 'bg-gray-500/20 text-gray-300',
    submitted: 'bg-blue-500/20 text-blue-300',
    under_review: 'bg-purple-500/20 text-purple-300',
    waitlisted: 'bg-orange-500/20 text-orange-300',
    accepted: 'bg-green-500/20 text-green-300',
    rejected: 'bg-red-500/20 text-red-300',
    withdrawn: 'bg-gray-500/20 text-gray-400',
  };

  const labels: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    under_review: 'Under Review',
    waitlisted: 'Waitlisted',
    accepted: 'Accepted',
    rejected: 'Not Selected',
    withdrawn: 'Withdrawn',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[status] || styles.draft}`}>
      {labels[status] || status}
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
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDraft = submission.status === 'draft';
  const isSubmitted = submission.status === 'submitted';
  const isUnderReview = submission.status === 'under_review';
  const canEdit = isDraft;
  const canSubmit = isDraft;
  const canWithdraw = isSubmitted || isUnderReview;
  const canDelete = isDraft;

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
                <StatusBadge status={submission.status} />
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
                    {submission.travel_assistance_required ? 'Requested' : 'Not needed'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Company Covers Travel</h3>
                  <p className="text-white">
                    {submission.company_can_cover_travel ? 'Yes' : 'No'}
                  </p>
                </div>
                {submission.special_requirements && (
                  <div className="sm:col-span-2">
                    <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Special Requirements</h3>
                    <p className="text-brand-gray-light whitespace-pre-wrap">
                      {submission.special_requirements}
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
