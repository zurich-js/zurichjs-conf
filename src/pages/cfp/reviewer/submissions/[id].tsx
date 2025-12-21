/**
 * CFP Reviewer Submission Detail Page
 * View submission and submit/edit review
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Heading } from '@/components/atoms';
import { supabase } from '@/lib/supabase/client';
import { useCfpReviewerSubmission, useSubmitReview } from '@/hooks/useCfp';
import { ReviewGuide, ReviewGuideButton } from '@/components/cfp/ReviewGuide';
import { useEscapeKey, useSubmitShortcut } from '@/hooks/useKeyboardShortcuts';
import {
  TYPE_LABELS,
  ReviewScores,
  StatusSection,
  SpeakerInfo,
  ReviewForm,
  SuccessMessage,
  ReadOnlyNotice,
  CommitteeReviews,
  SubmissionDetails,
} from '@/components/cfp/reviewer';

export default function ReviewerSubmission() {
  const router = useRouter();
  const { id } = router.query;

  const [authChecked, setAuthChecked] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showStatusActions, setShowStatusActions] = useState(false);

  // Form state
  const [scores, setScores] = useState<ReviewScores>({
    score_overall: 0,
    score_relevance: 0,
    score_technical_depth: 0,
    score_clarity: 0,
    score_diversity: 0,
  });
  const [privateNotes, setPrivateNotes] = useState('');
  const [feedback, setFeedback] = useState('');
  const [formInitialized, setFormInitialized] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user || !user.email) {
        router.replace('/cfp/reviewer/login');
        return;
      }

      setAuthChecked(true);
    };

    checkAuth();
  }, [router]);

  // Fetch submission data
  const { submission, reviewer, isLoading, error } = useCfpReviewerSubmission((id as string) ?? '');

  // Submit review mutation
  const submitReviewMutation = useSubmitReview();

  // Initialize form with existing review data
  useEffect(() => {
    if (submission?.my_review && !formInitialized) {
      setScores({
        score_overall: submission.my_review.score_overall || 0,
        score_relevance: submission.my_review.score_relevance || 0,
        score_technical_depth: submission.my_review.score_technical_depth || 0,
        score_clarity: submission.my_review.score_clarity || 0,
        score_diversity: submission.my_review.score_diversity || 0,
      });
      setPrivateNotes(submission.my_review.private_notes || '');
      setFeedback(submission.my_review.feedback_to_speaker || '');
      setFormInitialized(true);
    }
  }, [submission, formInitialized]);

  const hasExistingReview = !!submission?.my_review;

  const handleScoreChange = (field: keyof ReviewScores, value: number) => {
    setScores((prev) => ({ ...prev, [field]: value }));
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!submission || statusUpdating) return;

    setStatusUpdating(true);
    try {
      const response = await fetch(`/api/cfp/submissions/${submission.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      router.reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setStatusUpdating(false);
      setShowStatusActions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (scores.score_overall < 1 || scores.score_overall > 5) {
      setFormError('Overall score is required (1-5)');
      return;
    }

    setFormError(null);

    try {
      await submitReviewMutation.mutateAsync({
        submissionId: submission!.id,
        isUpdate: hasExistingReview,
        data: {
          score_overall: scores.score_overall,
          score_relevance: scores.score_relevance || undefined,
          score_technical_depth: scores.score_technical_depth || undefined,
          score_clarity: scores.score_clarity || undefined,
          score_diversity: scores.score_diversity || undefined,
          private_notes: privateNotes || undefined,
          feedback_to_speaker: feedback || undefined,
        },
      });

      setSuccess(true);
      setTimeout(() => {
        router.push('/cfp/reviewer/dashboard');
      }, 1500);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Keyboard shortcuts
  const handleKeyboardSubmit = useCallback(() => {
    if (submission && !submitReviewMutation.isPending && !success) {
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission, submitReviewMutation.isPending, success, scores, privateNotes, feedback]);

  useSubmitShortcut(handleKeyboardSubmit, !!submission && !success);
  useEscapeKey(() => {
    if (showStatusActions) setShowStatusActions(false);
    if (showGuide) setShowGuide(false);
  }, showStatusActions || showGuide);

  // Loading state
  if (!authChecked || isLoading) {
    return (
      <div className="min-h-screen bg-brand-gray-darkest flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-brand-gray-light">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (error || !submission || !reviewer) {
    return (
      <div className="min-h-screen bg-brand-gray-darkest flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Submission not found'}</p>
          <Link
            href="/cfp/reviewer/dashboard"
            className="px-4 py-2 bg-brand-primary text-black rounded-lg font-medium"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isSuperAdmin = reviewer.role === 'super_admin';

  return (
    <>
      <SEO
        title={`Review: ${submission.title} | CFP`}
        description="Review CFP submission"
        noindex
      />

      <ReviewGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />

      <div className="min-h-screen bg-brand-gray-darkest">
        {/* Header */}
        <header className="border-b border-brand-gray-dark">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/cfp/reviewer/dashboard" className="flex items-center gap-3">
              <img src="/images/logo/zurichjs-square.png" alt="ZurichJS" className="h-10 w-10" />
              <span className="text-white font-semibold">Review Submission</span>
            </Link>
            <div className="flex items-center gap-4">
              <ReviewGuideButton onClick={() => setShowGuide(true)} />
              <Link
                href="/cfp/reviewer/dashboard"
                className="text-brand-gray-light hover:text-white text-sm transition-colors inline-flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Submission Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-sm font-medium whitespace-nowrap">
                    {TYPE_LABELS[submission.submission_type]}
                  </span>
                  <span className="text-brand-gray-light text-sm capitalize">
                    {submission.talk_level}
                  </span>
                </div>
                <Heading level="h1" className="text-2xl font-bold text-white mb-4">
                  {submission.title}
                </Heading>
              </div>

              {/* Status Section (super_admin only) */}
              {isSuperAdmin && (
                <StatusSection
                  status={submission.status}
                  showActions={showStatusActions}
                  isUpdating={statusUpdating}
                  onToggleActions={() => setShowStatusActions(!showStatusActions)}
                  onStatusChange={handleStatusChange}
                />
              )}

              {/* Speaker Info (super_admin only) */}
              {submission.speaker && isSuperAdmin && (
                <SpeakerInfo speaker={submission.speaker} />
              )}

              {/* Submission Content */}
              <SubmissionDetails
                submission={submission}
                isAnonymous={!isSuperAdmin}
              />

              {/* Committee Reviews (super_admin only) */}
              {isSuperAdmin && (
                <CommitteeReviews
                  reviews={submission.all_reviews || []}
                  stats={submission.stats}
                />
              )}
            </div>

            {/* Review Form Sidebar */}
            <div className="lg:col-span-1">
              {reviewer.role === 'readonly' && <ReadOnlyNotice />}

              {success ? (
                <SuccessMessage />
              ) : reviewer.role !== 'readonly' ? (
                <ReviewForm
                  scores={scores}
                  privateNotes={privateNotes}
                  feedback={feedback}
                  hasExistingReview={hasExistingReview}
                  isSubmitting={submitReviewMutation.isPending}
                  formError={formError}
                  stats={submission.stats}
                  onScoreChange={handleScoreChange}
                  onPrivateNotesChange={setPrivateNotes}
                  onFeedbackChange={setFeedback}
                  onSubmit={handleSubmit}
                />
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
