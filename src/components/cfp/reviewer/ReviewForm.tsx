/**
 * Review Form Component
 * Form for submitting or updating a review with all required criteria
 */

import Link from 'next/link';
import { Check, Eye, AlertCircle, SlidersHorizontal, HelpCircle, SkipForward, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/atoms';
import { SCORE_LABELS, SCORE_DESCRIPTIONS, ReviewScores, SubmissionStats } from './types';

interface ReviewFormProps {
  scores: ReviewScores;
  privateNotes: string;
  feedback: string;
  hasExistingReview: boolean;
  isSubmitting: boolean;
  formError: string | null;
  stats: SubmissionStats;
  onScoreChange: (field: keyof ReviewScores, value: number) => void;
  onPrivateNotesChange: (value: string) => void;
  onFeedbackChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onShowGuidelines?: () => void;
}

// Helper to check if all required scores are filled
function areAllScoresFilled(scores: ReviewScores): boolean {
  return Object.values(scores).every((score) => score > 0);
}

export function ReviewForm({
  scores,
  privateNotes,
  feedback,
  hasExistingReview,
  isSubmitting,
  formError,
  onScoreChange,
  onPrivateNotesChange,
  onFeedbackChange,
  onSubmit,
  onShowGuidelines,
}: ReviewFormProps) {
  const allScoresFilled = areAllScoresFilled(scores);

  return (
    <div className="lg:sticky lg:top-8 w-full">
      <form onSubmit={onSubmit} className="bg-brand-gray-dark rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 w-full">
        {/* Header with Guidelines link */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Your review</h2>
          {onShowGuidelines && (
            <button
              type="button"
              onClick={onShowGuidelines}
              className="text-sm text-brand-primary hover:text-brand-primary/80 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Guidelines
            </button>
          )}
        </div>

        {formError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{formError}</p>
          </div>
        )}

        {/* Score Fields */}
        <div className="space-y-4">
          {Object.entries(SCORE_LABELS).map(([field, label]) => {
            const currentScore = scores[field as keyof ReviewScores];
            const description = SCORE_DESCRIPTIONS[field as keyof typeof SCORE_DESCRIPTIONS];

            return (
              <div key={field}>
                <label className="flex items-center gap-1.5 text-sm font-medium text-white mb-2">
                  {label}
                  <span className="group relative">
                    <HelpCircle className="w-3.5 h-3.5 text-brand-gray-medium cursor-help" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-brand-gray-darkest text-xs text-brand-gray-light rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg border border-brand-gray-medium">
                      {description}
                    </span>
                  </span>
                </label>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex gap-1 sm:gap-1.5 flex-1 sm:flex-none">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => onScoreChange(field as keyof ReviewScores, n)}
                        className={`flex-1 sm:flex-none sm:w-10 h-10 sm:h-9 rounded-lg font-medium text-sm transition-colors cursor-pointer active:scale-95 ${
                          currentScore === n
                            ? 'bg-brand-primary text-black'
                            : 'bg-brand-gray-darkest text-brand-gray-light hover:bg-brand-gray-medium'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-baseline shrink-0">
                    <span className={`text-xl sm:text-2xl font-bold ${currentScore > 0 ? 'text-brand-primary' : 'text-brand-gray-medium'}`}>
                      {currentScore > 0 ? currentScore : '-'}
                    </span>
                    <span className="text-brand-gray-medium text-sm">/4</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Speaker Feedback */}
        <div>
          <label htmlFor="feedback" className="flex items-center gap-1.5 text-sm font-medium text-white mb-2">
            Speaker feedback
            <span className="group relative">
              <HelpCircle className="w-3.5 h-3.5 text-brand-gray-medium cursor-help" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-brand-gray-darkest text-xs text-brand-gray-light rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg border border-brand-gray-medium">
                Optional feedback shared with the speaker
              </span>
            </span>
          </label>
          <textarea
            id="feedback"
            value={feedback}
            onChange={(e) => onFeedbackChange(e.target.value)}
            placeholder="Constructive feedback for the speaker..."
            rows={3}
            className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all text-sm"
          />
        </div>

        {/* Internal Notes */}
        <div>
          <label htmlFor="private_notes" className="flex items-center gap-1.5 text-sm font-medium text-white mb-2">
            Internal Notes
            <span className="group relative">
              <HelpCircle className="w-3.5 h-3.5 text-brand-gray-medium cursor-help" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-brand-gray-darkest text-xs text-brand-gray-light rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg border border-brand-gray-medium">
                Private notes visible only to reviewers
              </span>
            </span>
          </label>
          <textarea
            id="private_notes"
            value={privateNotes}
            onChange={(e) => onPrivateNotesChange(e.target.value)}
            placeholder="Notes visible only to reviewers..."
            rows={3}
            className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all text-sm"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          disabled={isSubmitting || !allScoresFilled}
          className="w-full"
        >
          {hasExistingReview ? 'Update Review' : 'Submit Review'}
        </Button>
      </form>
    </div>
  );
}

interface SuccessMessageProps {
  message?: string;
  nextSubmissionId?: string | null;
  dashboardUrl?: string;
  returnTo?: string;
}

export function SuccessMessage({
  message = 'Review Submitted!',
  nextSubmissionId,
  dashboardUrl = '/cfp/reviewer/dashboard',
  returnTo,
}: SuccessMessageProps) {
  const nextHref = nextSubmissionId
    ? `/cfp/reviewer/submissions/${nextSubmissionId}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`
    : null;

  return (
    <div className="sticky top-8">
      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">{message}</h2>
        <div className="mt-4 space-y-3">
          {nextHref && (
            <Link
              href={nextHref}
              className="w-full px-4 py-2.5 bg-brand-primary text-black font-semibold rounded-xl hover:bg-brand-primary-dark transition-colors inline-flex items-center justify-center gap-2"
            >
              <SkipForward className="w-4 h-4" />
              Review Next
            </Link>
          )}
          <Link
            href={dashboardUrl}
            className="w-full px-4 py-2.5 text-brand-gray-light hover:text-white transition-colors inline-flex items-center justify-center gap-2 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ReadOnlyNotice() {
  return (
    <div className="sticky top-8">
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <Eye className="w-6 h-6 text-orange-400" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Read Only Access</h2>
        <p className="text-brand-gray-light text-sm">
          You can view submissions but cannot submit reviews.
        </p>
      </div>
    </div>
  );
}
