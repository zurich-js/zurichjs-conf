/**
 * CFP Reviewer Submission Detail Page
 * View submission and submit/edit review
 */

import React, { useReducer, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Heading } from '@/components/atoms';
import { getNextReviewerSubmissionId } from '@/lib/cfp/reviewer-navigation';
import { getReviewerPermissions } from '@/lib/cfp/reviewer-permissions';
import { supabase } from '@/lib/supabase/client';
import { useCfpReviewerSubmission, useSubmitReview } from '@/hooks/useCfp';
import { useBookmarks } from '@/hooks/cfp';
import { ReviewGuide } from '@/components/cfp/ReviewGuide';
import { useEscapeKey, useSubmitShortcut } from '@/hooks/useKeyboardShortcuts';
import {
  ReviewerPill,
  TYPE_LABELS,
  ReviewScores,
  SpeakerInfo,
  ReviewForm,
  SuccessMessage,
  ReadOnlyNotice,
  CommitteeReviews,
  SubmissionDetails,
} from '@/components/cfp/reviewer';

const initialScores: ReviewScores = {
  score_overall: 0,
  score_relevance: 0,
  score_technical_depth: 0,
  score_clarity: 0,
  score_diversity: 0,
};

interface FormState {
  scores: ReviewScores;
  privateNotes: string;
  feedback: string;
  error: string | null;
  success: boolean;
  initialized: boolean;
}

const initialFormState: FormState = {
  scores: initialScores,
  privateNotes: '',
  feedback: '',
  error: null,
  success: false,
  initialized: false,
};

type FormAction =
  | { type: 'RESET' }
  | { type: 'SET_SCORE'; field: keyof ReviewScores; value: number }
  | { type: 'SET_PRIVATE_NOTES'; value: string }
  | { type: 'SET_FEEDBACK'; value: string }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'INIT_FROM_REVIEW'; review: NonNullable<typeof initialFormState & { scores: ReviewScores }> };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'RESET':
      return initialFormState;
    case 'SET_SCORE':
      return { ...state, scores: { ...state.scores, [action.field]: action.value } };
    case 'SET_PRIVATE_NOTES':
      return { ...state, privateNotes: action.value };
    case 'SET_FEEDBACK':
      return { ...state, feedback: action.value };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'SUBMIT_SUCCESS':
      return { ...state, success: true, error: null, initialized: true };
    case 'INIT_FROM_REVIEW':
      return { ...state, ...action.review, initialized: true };
  }
}

export default function ReviewerSubmission() {
  const router = useRouter();
  const { id, returnTo } = router.query;
  const returnToParam = typeof returnTo === 'string' ? returnTo : '';

  const [authChecked, setAuthChecked] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [form, dispatch] = useReducer(formReducer, initialFormState);

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

  // Build dashboard URL with preserved filters
  const dashboardUrl = returnToParam
    ? `/cfp/reviewer/dashboard?${decodeURIComponent(returnToParam)}`
    : '/cfp/reviewer/dashboard';

  // Fetch submission data
  const { submission, reviewer, isLoading, error } = useCfpReviewerSubmission((id as string) ?? '');
  const { isBookmarked, toggleBookmark } = useBookmarks(reviewer?.email);

  // Submit review mutation
  const submitReviewMutation = useSubmitReview();

  const nextSubmissionId = useMemo(() => {
    if (typeof id !== 'string') return null;
    return getNextReviewerSubmissionId(id, returnToParam);
  }, [id, returnToParam]);

  // Reset form synchronously when submission changes (avoids stale success state)
  const [lastResetId, setLastResetId] = useState<string | undefined>();
  if (id && id !== lastResetId) {
    setLastResetId(id as string);
    dispatch({ type: 'RESET' });
  }

  // Initialize form with existing review data
  useEffect(() => {
    if (submission?.my_review && !form.initialized) {
      dispatch({
        type: 'INIT_FROM_REVIEW',
        review: {
          scores: {
            score_overall: submission.my_review.score_overall || 0,
            score_relevance: submission.my_review.score_relevance || 0,
            score_technical_depth: submission.my_review.score_technical_depth || 0,
            score_clarity: submission.my_review.score_clarity || 0,
            score_diversity: submission.my_review.score_diversity || 0,
          },
          privateNotes: submission.my_review.private_notes || '',
          feedback: submission.my_review.feedback_to_speaker || '',
          error: null,
          success: false,
          initialized: true,
        },
      });
    }
  }, [submission, form.initialized]);

  const hasExistingReview = !!submission?.my_review;
  const nextSubmissionHref = nextSubmissionId
    ? `/cfp/reviewer/submissions/${nextSubmissionId}${returnToParam ? `?returnTo=${encodeURIComponent(returnToParam)}` : ''}`
    : null;

  const handleScoreChange = (field: keyof ReviewScores, value: number) => {
    dispatch({ type: 'SET_SCORE', field, value });
  };

  const handleSecondaryAction = useCallback(() => {
    if (submitReviewMutation.isPending) return;
    void router.push(nextSubmissionHref ?? dashboardUrl);
  }, [dashboardUrl, nextSubmissionHref, router, submitReviewMutation.isPending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all dimensions are rated (scores must be 1-4)
    const missingScores = Object.entries(form.scores)
      .filter(([, value]) => value < 1 || value > 4)
      .map(([key]) => key.replace('score_', '').replace(/_/g, ' '));

    if (missingScores.length > 0) {
      dispatch({ type: 'SET_ERROR', error: `Please rate all dimensions. Missing: ${missingScores.join(', ')}` });
      return;
    }

    dispatch({ type: 'SET_ERROR', error: null });

    try {
      await submitReviewMutation.mutateAsync({
        submissionId: submission!.id,
        isUpdate: hasExistingReview,
        data: {
          score_overall: form.scores.score_overall,
          score_relevance: form.scores.score_relevance,
          score_technical_depth: form.scores.score_technical_depth,
          score_clarity: form.scores.score_clarity,
          score_diversity: form.scores.score_diversity,
          private_notes: form.privateNotes || undefined,
          feedback_to_speaker: form.feedback || undefined,
        },
      });

      dispatch({ type: 'SUBMIT_SUCCESS' });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : 'An error occurred' });
    }
  };

  // Keyboard shortcuts
  const handleKeyboardSubmit = useCallback(() => {
    if (submission && !submitReviewMutation.isPending && !form.success) {
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission, submitReviewMutation.isPending, form]);

  useSubmitShortcut(handleKeyboardSubmit, !!submission && !form.success);
  useEscapeKey(() => {
    if (showGuide) setShowGuide(false);
  }, showGuide);

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
            href={dashboardUrl}
            className="px-4 py-2 bg-brand-primary text-black rounded-lg font-medium"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const permissions = getReviewerPermissions(reviewer.role);

  return (
    <>
      <SEO
        title={`Review: ${submission.title} | CFP`}
        description="Review CFP submission"
        noindex
      />

      <ReviewGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />

      <div className="min-h-screen bg-brand-gray-darkest overflow-x-hidden">
        {/* Header */}
        <header className="border-b border-brand-gray-dark">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href={dashboardUrl} className="flex items-center gap-3">
              <img src="/images/logo/zurichjs-square.png" alt="ZurichJS" className="h-10 w-10" />
              <span className="text-white font-semibold">Zurich JS Conf 2026</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href={dashboardUrl}
                className="text-brand-gray-light hover:text-white text-sm transition-colors inline-flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back<span className="hidden sm:inline"> to Dashboard</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-sm mb-6">
            <Link
              href={dashboardUrl}
              className="text-white font-semibold hover:text-brand-primary transition-colors"
            >
              Dashboard
            </Link>
            <ChevronRight className="w-4 h-4 text-brand-gray-medium" />
            <span className="text-brand-gray-light truncate max-w-[200px] sm:max-w-[300px]">
              {submission.title}
            </span>
          </nav>
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Submission Details - shown first on mobile */}
            <div className="order-1 lg:col-span-2 space-y-6 min-w-0">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => toggleBookmark(submission.id)}
                    className={`p-2 rounded-full border transition-colors cursor-pointer ${
                      isBookmarked(submission.id)
                        ? 'border-brand-primary/40 bg-brand-primary/15 text-brand-primary'
                        : 'border-brand-gray-medium bg-brand-gray-dark text-brand-gray-light hover:text-white hover:border-brand-gray-light'
                    }`}
                    aria-label={isBookmarked(submission.id) ? 'Remove bookmark' : 'Bookmark talk'}
                    title={isBookmarked(submission.id) ? 'Remove bookmark' : 'Bookmark talk'}
                  >
                    <Bookmark className={`w-4 h-4 ${isBookmarked(submission.id) ? 'fill-current' : ''}`} />
                  </button>
                  <ReviewerPill tone="yellow">
                    {TYPE_LABELS[submission.submission_type]}
                  </ReviewerPill>
                  <ReviewerPill tone="purple" className="capitalize">
                    {submission.talk_level}
                  </ReviewerPill>
                </div>
                <Heading level="h1" className="text-xl sm:text-2xl font-bold text-white mb-4">
                  {submission.title}
                </Heading>
              </div>


              {/* Speaker Info */}
              {submission.speaker && permissions.canSeeSpeakerIdentity && (
                <SpeakerInfo speaker={submission.speaker} showEmail={permissions.canSeeSpeakerEmail} />
              )}

              {/* Submission Content */}
              <SubmissionDetails
                submission={submission}
                isAnonymous={!permissions.canSeeSpeakerIdentity}
                canSeeSpeakerResources={permissions.canSeeSpeakerResources}
              />

              {/* Committee Reviews */}
              {permissions.canSeeCommitteeReviews && (
                <CommitteeReviews
                  reviews={submission.all_reviews || []}
                  stats={submission.stats}
                />
              )}
            </div>

            {/* Review Form - shown after submission on mobile */}
            <div className="order-2 lg:col-span-1 min-w-0">
              {reviewer.role === 'readonly' && <ReadOnlyNotice />}

              {form.success ? (
                <SuccessMessage
                  nextSubmissionId={nextSubmissionId}
                  dashboardUrl={dashboardUrl}
                  returnTo={returnToParam || undefined}
                />
              ) : reviewer.role !== 'readonly' ? (
                <ReviewForm
                  scores={form.scores}
                  privateNotes={form.privateNotes}
                  feedback={form.feedback}
                  hasExistingReview={hasExistingReview}
                  isSubmitting={submitReviewMutation.isPending}
                  formError={form.error}
                  stats={submission.stats}
                  onScoreChange={handleScoreChange}
                  onPrivateNotesChange={(v) => dispatch({ type: 'SET_PRIVATE_NOTES', value: v })}
                  onFeedbackChange={(v) => dispatch({ type: 'SET_FEEDBACK', value: v })}
                  onSubmit={handleSubmit}
                  onSkipToNext={handleSecondaryAction}
                  secondaryActionLabel={nextSubmissionHref ? 'Skip This Talk' : 'Back to Dashboard'}
                  onShowGuidelines={() => setShowGuide(true)}
                />
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
