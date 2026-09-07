import { MessageSquareText, Star, X } from 'lucide-react';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import type { SessionFeedbackFeedEntry } from '@/lib/feedback/types';
import { formatFeedbackStamp, ratingTone } from './format';

export interface FeedbackFeedProps {
  entries: SessionFeedbackFeedEntry[];
  /** Title of the session the feed is filtered to, if any */
  filterTitle: string | null;
  onClearFilter: () => void;
  commentsOnly: boolean;
  onToggleCommentsOnly: (next: boolean) => void;
}

/** Five small stars with `rating` of them filled. */
function StarRow({ rating }: { rating: number }): React.JSX.Element {
  return (
    <span className={`inline-flex items-center gap-0.5 ${ratingTone(rating)}`} role="img" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((step) => (
        <Star key={step} className={`w-3.5 h-3.5 ${step <= rating ? 'fill-current' : 'text-gray-300'}`} aria-hidden="true" />
      ))}
    </span>
  );
}

/** Newest-first stream of individual ratings, as they arrive. */
export function FeedbackFeed({ entries, filterTitle, onClearFilter, commentsOnly, onToggleCommentsOnly }: FeedbackFeedProps): React.JSX.Element {
  const visible = commentsOnly ? entries.filter((entry) => entry.comment) : entries;

  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col min-h-[24rem]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-bold text-black">Live feed</h2>
          {filterTitle ? (
            <button
              type="button"
              onClick={onClearFilter}
              className="inline-flex max-w-xs items-center gap-1 truncate rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200 cursor-pointer hover:bg-amber-100"
            >
              <span className="truncate">{filterTitle}</span>
              <X className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span className="sr-only">Clear session filter</span>
            </button>
          ) : null}
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={commentsOnly}
            onChange={(event) => onToggleCommentsOnly(event.target.checked)}
            className="rounded border-gray-300"
          />
          Comments only
        </label>
      </div>

      {visible.length === 0 ? (
        <AdminEmptyState
          icon={<MessageSquareText className="w-6 h-6" />}
          title={entries.length === 0 ? 'No feedback yet' : 'No comments yet'}
          description={
            entries.length === 0
              ? 'Ratings appear here the moment attendees submit them from the schedule.'
              : 'Every response so far is a star rating without a comment.'
          }
        />
      ) : (
        <ul className="divide-y divide-gray-100 overflow-y-auto max-h-[70vh]" aria-live="polite">
          {visible.map((entry) => (
            <li key={entry.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StarRow rating={entry.rating} />
                <time dateTime={entry.created_at} className="text-xs text-gray-400 tabular-nums">
                  {formatFeedbackStamp(entry.created_at)}
                </time>
              </div>
              {!filterTitle ? <p className="mt-1 text-xs font-medium text-gray-600">{entry.sessionTitle}</p> : null}
              {entry.comment ? <p className="mt-1.5 text-sm text-black whitespace-pre-line break-words">{entry.comment}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
