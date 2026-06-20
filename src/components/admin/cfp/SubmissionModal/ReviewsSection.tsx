/**
 * Reviews Section Component
 * Simplified committee reviews with copy options for feedback generation
 */

import { useState, useRef, useEffect } from 'react';
import { Loader2, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { CfpReviewWithReviewer, CfpAdminSubmission } from '@/lib/types/cfp-admin';

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

function buildReviewBlock(r: CfpReviewWithReviewer, i: number): string {
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
}

function buildRawContext(submission: CfpAdminSubmission, reviews: CfpReviewWithReviewer[]): string {
  const reviewBlocks = reviews.map((r, i) => buildReviewBlock(r, i)).join('\n\n');

  return `Talk title: ${submission.title}
Speaker: ${submission.speaker?.first_name} ${submission.speaker?.last_name}
Talk type: ${submission.submission_type} (${submission.talk_level})
Abstract: ${submission.abstract}

${reviews.length} committee reviews:

${reviewBlocks}`;
}

function buildFullPrompt(submission: CfpAdminSubmission, reviews: CfpReviewWithReviewer[]): string {
  return `I need to write a personalized, constructive feedback email to send to a conference speaker about their CFP submission. I'm writing this on behalf of the review committee.

${buildRawContext(submission, reviews)}

Write a 2-3 paragraph feedback email that:
- Thanks them for submitting
- Highlights what reviewers liked
- Gives constructive suggestions from the feedback
- Is encouraging regardless of acceptance/rejection
- Does NOT reveal individual reviewer identities or exact scores
- Is written from "I" on behalf of the committee (not "we the committee")
- Feels personal, not templated`;
}

export function ReviewsSection({ reviews, isLoading, aggregateScores, submission }: ReviewsSectionProps) {
  const [copiedType, setCopiedType] = useState<'raw' | 'prompt' | null>(null);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowCopyMenu(false);
      }
    }
    if (showCopyMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCopyMenu]);

  const handleCopy = (type: 'raw' | 'prompt') => {
    const text = type === 'raw'
      ? buildRawContext(submission, reviews)
      : buildFullPrompt(submission, reviews);
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setShowCopyMenu(false);
    setTimeout(() => setCopiedType(null), 2000);
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
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowCopyMenu((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {copiedType ? (
                <Check className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copiedType ? 'Copied!' : 'Copy for AI'}
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
            {showCopyMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                <button
                  onClick={() => handleCopy('raw')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <p className="text-sm font-medium text-black">Raw review data</p>
                  <p className="text-xs text-gray-500">Scores & feedback as context for your own prompt</p>
                </button>
                <button
                  onClick={() => handleCopy('prompt')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <p className="text-sm font-medium text-black">Full prompt</p>
                  <p className="text-xs text-gray-500">Ready-made prompt to generate a feedback email</p>
                </button>
              </div>
            )}
          </div>
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

          {/* Individual Reviews */}
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
