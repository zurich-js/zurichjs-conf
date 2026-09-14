import { MessageSquareText, Star } from 'lucide-react';
import { AdminModal } from '@/components/admin/AdminModal';
import type { FeedbackDetailView } from '@/lib/types/session-feedback';
import { formatFeedbackStamp, formatScheduleStart, ratingTone } from './format';
import { RatingBreakdown } from './RatingBreakdown';
import { StarRating } from './StarRating';

export interface FeedbackDetailModalProps {
  detail: FeedbackDetailView;
  onClose: () => void;
  /** Jump from a speaker's session list into that session's own detail view */
  onOpenSession: (scheduleItemId: string) => void;
}

/** One headline figure in the detail header. */
function Stat({ label, value, tone }: { label: string; value: string; tone?: string }): React.JSX.Element {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${tone ?? 'text-black'}`}>{value}</div>
    </div>
  );
}

/**
 * Drill-down for a single talk or a single speaker: headline rollup, star
 * histogram, the speaker's per-session split, and every comment received.
 */
export function FeedbackDetailModal({ detail, onClose, onOpenSession }: FeedbackDetailModalProps): React.JSX.Element {
  const comments = detail.entries.filter((entry) => entry.comment);

  return (
    <AdminModal
      isOpen
      onClose={onClose}
      title={detail.title}
      subtitle={detail.subtitle ?? undefined}
      size="3xl"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Responses" value={String(detail.responseCount)} />
          <Stat
            label="Average"
            value={detail.averageRating === null ? '—' : detail.averageRating.toFixed(1)}
            tone={ratingTone(detail.averageRating)}
          />
          <Stat label="Comments" value={String(detail.commentCount)} />
        </div>

        <section aria-labelledby="feedback-detail-breakdown">
          <h4 id="feedback-detail-breakdown" className="mb-2 text-sm font-bold text-black">
            Rating breakdown
          </h4>
          <RatingBreakdown distribution={detail.distribution} total={detail.responseCount} />
        </section>

        {detail.sessions.length > 0 ? (
          <section aria-labelledby="feedback-detail-sessions">
            <h4 id="feedback-detail-sessions" className="mb-2 text-sm font-bold text-black">
              Sessions ({detail.sessions.length})
            </h4>
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {detail.sessions.map((session) => (
                <li key={session.scheduleItemId} className="flex items-center justify-between gap-3 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onOpenSession(session.scheduleItemId)}
                    className="min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <span className="block truncate text-sm font-medium text-black hover:underline">{session.title}</span>
                    <span className="block text-xs text-gray-500">
                      {session.date} · {formatScheduleStart(session.startTime)}
                    </span>
                  </button>
                  <span className="shrink-0 text-xs tabular-nums text-gray-500">
                    {session.responseCount} {session.responseCount === 1 ? 'response' : 'responses'}
                  </span>
                  <span className={`w-12 shrink-0 text-right text-sm font-semibold tabular-nums ${ratingTone(session.averageRating)}`}>
                    {session.averageRating === null ? (
                      '—'
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" aria-hidden="true" />
                        {session.averageRating.toFixed(1)}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="feedback-detail-comments">
          <h4 id="feedback-detail-comments" className="mb-2 text-sm font-bold text-black">
            Comments ({comments.length})
          </h4>
          {comments.length === 0 ? (
            <p className="flex items-center gap-2 rounded-lg border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-500">
              <MessageSquareText className="w-4 h-4 shrink-0" aria-hidden="true" />
              {detail.responseCount === 0
                ? 'No feedback yet.'
                : 'Every response so far is a star rating without a comment.'}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {comments.map((entry) => (
                <li key={entry.id} className="px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StarRating rating={entry.rating} />
                    <time dateTime={entry.created_at} className="text-xs tabular-nums text-gray-400">
                      {formatFeedbackStamp(entry.created_at)}
                    </time>
                  </div>
                  {detail.kind === 'speaker' ? (
                    <p className="mt-1 text-xs font-medium text-gray-600">{entry.sessionTitle}</p>
                  ) : null}
                  <p className="mt-1.5 whitespace-pre-line break-words text-sm text-black">{entry.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminModal>
  );
}
