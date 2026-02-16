/**
 * Reviews Section Component
 * Displays committee reviews with aggregate and individual scores
 */

import { Loader2 } from 'lucide-react';
import type { CfpReviewWithReviewer } from '@/lib/types/cfp-admin';

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
}

function ScoreDisplay({ value, label }: { value: number | null; label: string }) {
  const colorClass =
    value === null
      ? 'text-gray-400'
      : value >= 4
        ? 'text-green-600'
        : value >= 3
          ? 'text-yellow-600'
          : 'text-red-600';

  return (
    <div className="bg-gray-50 rounded p-2 text-center">
      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
      <p className={`text-base font-bold ${colorClass}`}>{value !== null ? (Number.isInteger(value) ? value : value.toFixed(2)) : '-'}</p>
    </div>
  );
}

export function ReviewsSection({ reviews, isLoading, aggregateScores }: ReviewsSectionProps) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-3">Committee Reviews</h4>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-black" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">No reviews yet</p>
      ) : (
        <div className="space-y-4">
          {/* Aggregate Scores */}
          {aggregateScores && (
            <div className="bg-white rounded-lg p-3 border border-gray-200 mb-4">
              <p className="text-xs text-black font-semibold mb-2">Aggregate Scores ({reviews.length} reviews)</p>
              {/* Mobile: Overall prominent, others in 2x2 grid */}
              <div className="sm:hidden">
                <div className="bg-gray-100 rounded-lg p-3 mb-2 text-center">
                  <p className="text-xs text-gray-500">Overall</p>
                  <p className="text-2xl font-bold text-black">{aggregateScores.overall?.toFixed(2) || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <ScoreDisplay value={aggregateScores.relevance} label="Relevance" />
                  <ScoreDisplay value={aggregateScores.technical_depth} label="Depth" />
                  <ScoreDisplay value={aggregateScores.clarity} label="Clarity" />
                  <ScoreDisplay value={aggregateScores.diversity} label="Originality" />
                </div>
              </div>
              {/* Desktop: 5 columns */}
              <div className="hidden sm:grid grid-cols-5 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500">Overall</p>
                  <p className="text-lg font-bold text-black">{aggregateScores.overall?.toFixed(2) || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Relevance</p>
                  <p className="text-lg font-bold text-black">{aggregateScores.relevance?.toFixed(2) || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Depth</p>
                  <p className="text-lg font-bold text-black">{aggregateScores.technical_depth?.toFixed(2) || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Clarity</p>
                  <p className="text-lg font-bold text-black">{aggregateScores.clarity?.toFixed(2) || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Originality</p>
                  <p className="text-lg font-bold text-black">{aggregateScores.diversity?.toFixed(2) || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Individual Reviews */}
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
              {/* Reviewer Header */}
              <div className="flex items-start sm:items-center justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-black truncate">
                    {review.reviewer.name || review.reviewer.email}
                  </p>
                  {review.reviewer.name && <p className="text-xs text-gray-500 truncate">{review.reviewer.email}</p>}
                </div>
                <p className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Mobile Scores */}
              <div className="sm:hidden mb-3">
                <div
                  className={`bg-gray-100 rounded-lg p-2 mb-2 text-center ${
                    review.score_overall === null
                      ? ''
                      : review.score_overall >= 4
                        ? 'bg-green-50 border border-green-200'
                        : review.score_overall >= 3
                          ? 'bg-yellow-50 border border-yellow-200'
                          : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <p className="text-[10px] text-gray-500 uppercase">Overall</p>
                  <p
                    className={`text-xl font-bold ${
                      review.score_overall === null
                        ? 'text-gray-400'
                        : review.score_overall >= 4
                          ? 'text-green-600'
                          : review.score_overall >= 3
                            ? 'text-yellow-600'
                            : 'text-red-600'
                    }`}
                  >
                    {review.score_overall !== null ? review.score_overall : '-'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-center">
                  <ScoreDisplay value={review.score_relevance} label="Relevance" />
                  <ScoreDisplay value={review.score_technical_depth} label="Depth" />
                  <ScoreDisplay value={review.score_clarity} label="Clarity" />
                  <ScoreDisplay value={review.score_diversity} label="Originality" />
                </div>
              </div>

              {/* Desktop Scores Grid */}
              <div className="hidden sm:grid grid-cols-5 gap-2 text-center mb-3">
                {[
                  { label: 'Overall', value: review.score_overall },
                  { label: 'Relevance', value: review.score_relevance },
                  { label: 'Depth', value: review.score_technical_depth },
                  { label: 'Clarity', value: review.score_clarity },
                  { label: 'Originality', value: review.score_diversity },
                ].map(({ label, value }) => (
                  <ScoreDisplay key={label} value={value} label={label} />
                ))}
              </div>

              {/* Notes */}
              {review.private_notes && (
                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200 mb-2">
                  <p className="text-xs font-semibold text-yellow-800 mb-1">Private Notes (Committee Only)</p>
                  <p className="text-sm text-yellow-900 whitespace-pre-wrap">{review.private_notes}</p>
                </div>
              )}

              {review.feedback_to_speaker && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-800 mb-1">Feedback to Speaker</p>
                  <p className="text-sm text-blue-900 whitespace-pre-wrap">{review.feedback_to_speaker}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
