import { Mic, Star } from 'lucide-react';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import type { SpeakerFeedbackSummary } from '@/lib/types/session-feedback';
import { DistributionBar } from './DistributionBar';
import { ratingTone } from './format';

export interface SpeakerFeedbackTableProps {
  speakers: SpeakerFeedbackSummary[];
  selectedSpeakerId: string | null;
  /** Filters the feed to every session this speaker appeared in */
  onSelect: (speakerId: string | null) => void;
  /** Opens the per-speaker drill-down */
  onOpenDetail: (speakerId: string) => void;
}

/**
 * One row per speaker, ratings pooled across every session they appeared in.
 * Clicking the row filters the feed; clicking the name opens their detail view.
 */
export function SpeakerFeedbackTable({
  speakers,
  selectedSpeakerId,
  onSelect,
  onOpenDetail,
}: SpeakerFeedbackTableProps): React.JSX.Element {
  if (speakers.length === 0) {
    return (
      <AdminEmptyState
        icon={<Mic className="w-6 h-6" />}
        title="No speakers on the schedule yet"
        description="Speakers appear here once their sessions are scheduled and visible."
      />
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" className="px-4 py-3">Speaker</th>
              <th scope="col" className="px-4 py-3 text-right">Sessions</th>
              <th scope="col" className="px-4 py-3 text-right">Responses</th>
              <th scope="col" className="px-4 py-3 text-right">Average</th>
              <th scope="col" className="px-4 py-3 w-48">Distribution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {speakers.map((speaker) => {
              const isSelected = selectedSpeakerId === speaker.speakerId;
              return (
                <tr
                  key={speaker.speakerId}
                  aria-selected={isSelected}
                  className={`cursor-pointer transition-colors ${isSelected ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                  onClick={() => onSelect(isSelected ? null : speaker.speakerId)}
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-left font-medium text-black hover:underline cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenDetail(speaker.speakerId);
                      }}
                    >
                      {speaker.name}
                      <span className="sr-only"> — open feedback detail</span>
                    </button>
                    <div className="text-xs text-gray-500">
                      {speaker.role ?? speaker.sessions.map((session) => session.title).join(', ')}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-600">{speaker.sessions.length}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-black">{speaker.responseCount}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-semibold ${ratingTone(speaker.averageRating)}`}>
                    {speaker.averageRating === null ? (
                      '—'
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                        {speaker.averageRating.toFixed(1)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <DistributionBar distribution={speaker.distribution} total={speaker.responseCount} />
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
