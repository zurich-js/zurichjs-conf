/**
 * Committee Reviews Component
 * Display all reviews for a submission (super_admin only)
 */

import { FileText } from 'lucide-react';
import type { ReviewData, SubmissionStats } from './types';

interface CommitteeReviewsProps {
  reviews: ReviewData[];
  stats: SubmissionStats;
}

function ScoreCell({ value, label, required }: { value: number | null | undefined; label: string; required?: boolean }) {
  // Color scale for 1-4 scoring: 4/3 = green, 2 = yellow, 1 = red
  const colorClass = value
    ? value >= 3 ? 'text-green-400' : value >= 2 ? 'text-yellow-400' : 'text-red-400'
    : 'text-brand-gray-medium';

  return (
    <div className="text-center">
      <div className={`text-lg font-semibold ${colorClass}`}>
        {value || '—'}
      </div>
      <div className="text-xs text-brand-gray-medium">
        {label}{required && '*'}
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewData }) {
  const reviewerInitial = (review.reviewer?.name || review.reviewer?.email || '?')[0].toUpperCase();
  const reviewerName = review.reviewer?.name || review.reviewer?.email?.split('@')[0] || 'Reviewer';

  return (
    <div className="bg-brand-gray-darkest rounded-xl p-4">
      {/* Reviewer Info */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-brand-gray-medium">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center">
            <span className="text-brand-primary text-sm font-medium">
              {reviewerInitial}
            </span>
          </div>
          <div>
            <div className="text-white text-sm font-medium">{reviewerName}</div>
            {review.reviewer?.name && (
              <div className="text-xs text-brand-gray-medium">
                {review.reviewer.email}
              </div>
            )}
          </div>
        </div>
        <span className="text-xs text-brand-gray-medium">
          {new Date(review.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>

      {/* Scores Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
        <ScoreCell value={review.score_overall} label="Overall" required />
        <ScoreCell value={review.score_relevance} label="Relevance" />
        <ScoreCell value={review.score_technical_depth} label="Technical" />
        <ScoreCell value={review.score_clarity} label="Clarity" />
        <ScoreCell value={review.score_diversity} label="Diversity" />
      </div>

      {/* Notes */}
      {review.private_notes && (
        <div className="mt-3 pt-3 border-t border-brand-gray-medium">
          <h4 className="text-xs font-medium text-brand-gray-medium mb-1">Private Notes</h4>
          <p className="text-sm text-brand-gray-light whitespace-pre-wrap">{review.private_notes}</p>
        </div>
      )}

      {/* Feedback to Speaker */}
      {review.feedback_to_speaker && (
        <div className="mt-3 pt-3 border-t border-brand-gray-medium">
          <h4 className="text-xs font-medium text-brand-gray-medium mb-1">Feedback to Speaker</h4>
          <p className="text-sm text-brand-gray-light whitespace-pre-wrap">{review.feedback_to_speaker}</p>
        </div>
      )}
    </div>
  );
}

function AggregateStats({ stats }: { stats: SubmissionStats }) {
  const averages = [
    { key: 'avg_overall', label: 'Overall' },
    { key: 'avg_relevance', label: 'Relevance' },
    { key: 'avg_technical_depth', label: 'Technical' },
    { key: 'avg_clarity', label: 'Clarity' },
    { key: 'avg_diversity', label: 'Diversity' },
  ];

  return (
    <div className="bg-brand-gray-darkest rounded-xl p-4 mb-4">
      <h3 className="text-sm font-medium text-brand-gray-medium mb-3">Average Scores</h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {averages.map(({ key, label }) => {
          const value = stats[key as keyof SubmissionStats];
          return (
            <div key={key} className="text-center">
              <div className="text-xl font-bold text-white">
                {typeof value === 'number' ? value.toFixed(2) : '—'}
              </div>
              <div className="text-xs text-brand-gray-medium">{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 bg-brand-gray-darkest rounded-full flex items-center justify-center mx-auto mb-3">
        <FileText className="w-6 h-6 text-brand-gray-medium" />
      </div>
      <p className="text-brand-gray-light text-sm">No reviews yet</p>
      <p className="text-brand-gray-medium text-xs mt-1">Be the first to review this submission</p>
    </div>
  );
}

export function CommitteeReviews({ reviews, stats }: CommitteeReviewsProps) {
  return (
    <section className="bg-brand-gray-dark rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Committee Reviews</h2>
        <span className="text-sm text-brand-gray-light">
          {reviews.length} review{reviews.length !== 1 ? 's' : ''}
        </span>
      </div>

      {stats.review_count > 0 && <AggregateStats stats={stats} />}

      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  );
}
