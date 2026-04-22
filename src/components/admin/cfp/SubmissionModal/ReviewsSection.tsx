/**
 * Reviews Section Component
 * Simplified committee reviews with copy-as-prompt for feedback generation
 */

import { useState } from 'react';
import { Loader2, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { CfpReviewWithReviewer } from '@/lib/types/cfp-admin';
import type { CfpAdminSubmission } from '@/lib/types/cfp-admin';

interface AggregateScores {
  overall: number | null;
  relevance: number | null;
  technical_depth: number | null;
  clarity: number | null;
  diversity: number | null;
}

interface ReviewsSectionProps {
  reviews: CfpReviewWithReviewer[];
  isLoading: boolean;
  aggregateScores: AggregateScores | null;
  submission: CfpAdminSubmission;
}

function scoreColor(value: number | null): string {
  if (value === null) return 'text-gray-400';
  if (value >= 4) return 'text-green-600';
  if (value >= 3) return 'text-yellow-600';
  return 'text-red-600';
}

function formatScore(value: number | null): string {
  if (value === null) return '-';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function buildPrompt(submission: CfpAdminSubmission, reviews: CfpReviewWithReviewer[]): string {
  const reviewBlocks = reviews.map((r, i) => {
    const scores = [
      `Overall: ${formatScore(r.score_overall)}/5`,
      `Relevance: ${formatScore(r.score_relevance)}/5`,
      `Technical Depth: ${formatScore(r.score_technical_depth)}/5`,
      `Clarity: ${formatScore(r.score_clarity)}/5`,
      `Originality: ${formatScore(r.score_diversity)}/5`,
    ].join(', ');

    let block = `Review ${i + 1}:\nScores: ${scores}`;
    if (r.private_notes) block += `\nCommittee notes: ${r.private_notes}`;
    if (r.feedback_to_speaker) block += `\nFeedback to speaker: ${r.feedback_to_speaker}`;
    return block;
  }).join('\n\n');

  return `I need to write a constructive, encouraging feedback summary to send to a conference speaker about their CFP submission. Write it as a short email paragraph — warm but honest, highlighting strengths and suggesting improvements.

Talk title: ${submission.title}
Talk type: ${submission.submission_type} (${submission.talk_level})
Abstract: ${submission.abstract}

${reviews.length} committee reviews:

${reviewBlocks}

Write a 2-3 paragraph feedback summary that:
- Thanks them for submitting
- Highlights what reviewers liked
- Gives constructive suggestions from the feedback
- Is encouraging regardless of acceptance/rejection
- Does NOT reveal individual reviewer identities or exact scores
- Speaks as "the review committee" (not "I")`;
}

export function ReviewsSection({ reviews, isLoading, aggregateScores, submission }: ReviewsSectionProps) {
  const [copied, setCopied] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(buildPrompt(submission, reviews));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleReview = (id: string) => {
    setExpandedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-black uppercase tracking-wide">Committee Reviews</h4>
        {reviews.length > 0 && (
          <button
            onClick={handleCopyPrompt}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy as prompt'}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-black" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">No reviews yet</p>
      ) : (
        <div className="space-y-3">
          {/* Aggregate scores - single row */}
          {aggregateScores && (
            <div className="bg-white rounded-lg p-3 border border-gray-200 flex items-center gap-4 flex-wrap">
              <span className="text-xs text-gray-500">{reviews.length} reviews</span>
              <div className="flex items-center gap-3 flex-wrap">
                <ScoreChip label="Overall" value={aggregateScores.overall} />
                <ScoreChip label="Relevance" value={aggregateScores.relevance} />
                <ScoreChip label="Depth" value={aggregateScores.technical_depth} />
                <ScoreChip label="Clarity" value={aggregateScores.clarity} />
                <ScoreChip label="Originality" value={aggregateScores.diversity} />
              </div>
            </div>
          )}

          {/* Individual Reviews - collapsed by default, show only score + feedback preview */}
          {reviews.map((review) => {
            const isExpanded = expandedReviews.has(review.id);
            const hasFeedback = review.feedback_to_speaker || review.private_notes;

            return (
              <div key={review.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleReview(review.id)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-lg font-bold ${scoreColor(review.score_overall)}`}>
                      {formatScore(review.score_overall)}
                    </span>
                    <span className="text-sm text-gray-700 truncate">
                      {review.reviewer.name || review.reviewer.email}
                    </span>
                    <span className="text-xs text-gray-400 hidden sm:inline">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {hasFeedback && !isExpanded && (
                      <span className="text-xs text-blue-500 hidden sm:inline">has feedback</span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
                    {/* Score chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <ScoreChip label="Relevance" value={review.score_relevance} />
                      <ScoreChip label="Depth" value={review.score_technical_depth} />
                      <ScoreChip label="Clarity" value={review.score_clarity} />
                      <ScoreChip label="Originality" value={review.score_diversity} />
                    </div>

                    {review.private_notes && (
                      <div className="bg-yellow-50 rounded-lg p-2.5 border border-yellow-200">
                        <p className="text-xs font-semibold text-yellow-800 mb-0.5">Private Notes</p>
                        <p className="text-sm text-yellow-900 whitespace-pre-wrap">{review.private_notes}</p>
                      </div>
                    )}

                    {review.feedback_to_speaker && (
                      <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-200">
                        <p className="text-xs font-semibold text-blue-800 mb-0.5">Feedback to Speaker</p>
                        <p className="text-sm text-blue-900 whitespace-pre-wrap">{review.feedback_to_speaker}</p>
                      </div>
                    )}

                    {!review.private_notes && !review.feedback_to_speaker && (
                      <p className="text-xs text-gray-400">No written feedback</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScoreChip({ label, value }: { label: string; value: number | null }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={`font-bold ${scoreColor(value)}`}>{formatScore(value)}</span>
    </span>
  );
}
