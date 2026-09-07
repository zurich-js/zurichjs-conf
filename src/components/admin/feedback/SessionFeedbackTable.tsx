import { Star } from 'lucide-react';
import type { SessionFeedbackSummary } from '@/lib/feedback/types';
import { KIND_LABELS, formatScheduleStart, ratingTone } from './format';

interface SessionFeedbackTableProps {
  sessions: SessionFeedbackSummary[];
  selectedItemId: string | null;
  onSelect: (scheduleItemId: string | null) => void;
}

/** Stacked bar of one-to-five-star counts; a flat grey track when there are none. */
function DistributionBar({ distribution, total }: { distribution: SessionFeedbackSummary['distribution']; total: number }) {
  if (total === 0) {
    return <div className="h-2 w-full rounded-full bg-gray-100" aria-hidden="true" />;
  }
  const shades = ['bg-red-400', 'bg-orange-300', 'bg-amber-300', 'bg-lime-400', 'bg-green-500'];
  const label = distribution.map((count, index) => `${count}× ${index + 1} star`).join(', ');
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100" role="img" aria-label={label} title={label}>
      {distribution.map((count, index) =>
        count > 0 ? (
          <div key={index} className={shades[index]} style={{ width: `${(count / total) * 100}%` }} />
        ) : null
      )}
    </div>
  );
}

/**
 * One row per rateable session in schedule order. Clicking a row filters the
 * comment feed to that session; clicking it again clears the filter.
 */
export function SessionFeedbackTable({ sessions, selectedItemId, onSelect }: SessionFeedbackTableProps) {
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
                        onSelect(isSelected ? null : session.scheduleItemId);
                      }}
                      aria-pressed={isSelected}
                    >
                      {session.title}
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
