import { Star } from 'lucide-react';
import type { SessionFeedbackSummary } from '@/lib/types/session-feedback';
import { DistributionBar } from './DistributionBar';
import { FeedFilterToggle } from './FeedFilterToggle';
import { KIND_LABELS, formatScheduleStart, ratingTone } from './format';

export interface SessionFeedbackTableProps {
  sessions: SessionFeedbackSummary[];
  selectedItemId: string | null;
  /** Filters the feed to this session */
  onSelect: (scheduleItemId: string | null) => void;
  /** Opens the per-talk drill-down */
  onOpenDetail: (scheduleItemId: string) => void;
}

/**
 * One row per rateable session in schedule order. The title opens that talk's
 * own feedback view; the filter toggle (or a click anywhere on the row) narrows
 * the comment feed to it.
 */
export function SessionFeedbackTable({ sessions, selectedItemId, onSelect, onOpenDetail }: SessionFeedbackTableProps): React.JSX.Element {
  let lastDate: string | null = null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" className="px-4 py-3">Time</th>
              <th scope="col" className="px-4 py-3">Session</th>
              <th scope="col" className="px-4 py-3 text-right">Responses</th>
              <th scope="col" className="px-4 py-3 text-right">Average</th>
              <th scope="col" className="px-4 py-3 w-48">Distribution</th>
              <th scope="col" className="px-4 py-3 text-right">
                <span className="sr-only">Filter feed</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sessions.map((session) => {
              const showDate = session.date !== lastDate;
              lastDate = session.date;
              const isSelected = selectedItemId === session.scheduleItemId;
              return (
                <tr
                  key={session.scheduleItemId}
                  aria-selected={isSelected}
                  className={`cursor-pointer transition-colors ${isSelected ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                  onClick={() => onSelect(isSelected ? null : session.scheduleItemId)}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {showDate ? <div className="text-xs text-gray-400">{session.date}</div> : null}
                    {formatScheduleStart(session.startTime)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-left font-medium text-black hover:underline cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenDetail(session.scheduleItemId);
                      }}
                    >
                      {session.title}
                      <span className="sr-only"> — open feedback detail</span>
                    </button>
                    <div className="text-xs text-gray-500">
                      {session.kind ? KIND_LABELS[session.kind] : 'Session'}
                      {session.speakers.length > 0 ? ` · ${session.speakers.join(', ')}` : ''}
                      {session.room ? ` · ${session.room}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-black">{session.responseCount}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-semibold ${ratingTone(session.averageRating)}`}>
                    {session.averageRating === null ? (
                      '—'
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                        {session.averageRating.toFixed(1)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <DistributionBar distribution={session.distribution} total={session.responseCount} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <FeedFilterToggle
                      isActive={isSelected}
                      label={session.title}
                      onToggle={() => onSelect(isSelected ? null : session.scheduleItemId)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
