/**
 * Review Form Component
 * Form for submitting or updating a review with all required criteria
 */

import { Check, Eye, AlertCircle } from 'lucide-react';
import { Button } from '@/components/atoms';
import { SCORE_LABELS, ReviewScores, SubmissionStats } from './types';

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
}

// Helper to check if all required scores are filled
function areAllScoresFilled(scores: ReviewScores): boolean {
  return Object.values(scores).every((score) => score > 0);
}

// Get missing score labels for validation message
function getMissingScores(scores: ReviewScores): string[] {
  return Object.entries(scores)
    .filter(([, value]) => value === 0)
    .map(([key]) => SCORE_LABELS[key as keyof typeof SCORE_LABELS]);
}

export function ReviewForm({
  scores,
  privateNotes,
  feedback,
  hasExistingReview,
  isSubmitting,
  formError,
  stats,
  onScoreChange,
  onPrivateNotesChange,
  onFeedbackChange,
  onSubmit,
}: ReviewFormProps) {
  const allScoresFilled = areAllScoresFilled(scores);
  const missingScores = getMissingScores(scores);

  return (
    <div className="sticky top-8">
      <form onSubmit={onSubmit} className="bg-brand-gray-dark rounded-2xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white mb-2">
            {hasExistingReview ? 'Update Your Review' : 'Submit Your Review'}
          </h2>
          <p className="text-sm text-brand-gray-light">
            All scoring criteria are <span className="text-red-400 font-medium">required</span> for fair assessment
          </p>
        </div>

        {formError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{formError}</p>
          </div>
        )}

        {/* Score Fields */}
        <div className="space-y-5">
          {Object.entries(SCORE_LABELS).map(([field, label]) => {
            const currentScore = scores[field as keyof ReviewScores];
            const isFilled = currentScore > 0;

            return (
              <div key={field}>
                <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                  {label}
                  <span className="text-red-400">*</span>
                  {isFilled && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-green-400 font-normal">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => onScoreChange(field as keyof ReviewScores, n)}
                      className={`w-10 h-10 rounded-lg font-semibold transition-colors cursor-pointer ${
                        currentScore === n
                          ? 'bg-brand-primary text-black'
                          : 'bg-brand-gray-darkest text-brand-gray-light hover:bg-brand-gray-medium'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Missing scores warning */}
        {!allScoresFilled && missingScores.length > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
            <p className="text-orange-300 text-sm">
              <span className="font-medium">Missing scores:</span>{' '}
              {missingScores.join(', ')}
            </p>
          </div>
        )}

        {/* Private Notes */}
        <div>
          <label htmlFor="private_notes" className="block text-sm font-semibold text-white mb-2">
            Private Notes
            <span className="font-normal text-brand-gray-medium ml-2">(committee only)</span>
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

        {/* Feedback to Speaker */}
        <div>
          <label htmlFor="feedback" className="block text-sm font-semibold text-white mb-2">
            Feedback to Speaker
            <span className="font-normal text-brand-gray-medium ml-2">(optional)</span>
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

        {!allScoresFilled && (
          <p className="text-xs text-brand-gray-medium text-center">
            Complete all scoring criteria to submit your review
          </p>
        )}
      </form>

      {/* Stats Card */}
      <div className="bg-brand-gray-dark rounded-xl p-4 mt-4">
        <h3 className="text-sm font-semibold text-white mb-2">Review Stats</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-brand-gray-medium">Reviews:</span>
            <span className="text-white ml-1">{stats.review_count}</span>
          </div>
          {stats.avg_overall && (
            <div>
              <span className="text-brand-gray-medium">Avg:</span>
              <span className="text-white ml-1">{stats.avg_overall.toFixed(1)}/5</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SuccessMessageProps {
  message?: string;
}

export function SuccessMessage({ message = 'Review Submitted!' }: SuccessMessageProps) {
  return (
    <div className="sticky top-8">
      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">{message}</h2>
        <p className="text-brand-gray-light">Redirecting to dashboard...</p>
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
