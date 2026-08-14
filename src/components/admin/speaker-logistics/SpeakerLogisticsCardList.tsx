/**
 * Speaker Logistics Card List (mobile)
 * Progressive disclosure: compact card per speaker (name, status, RSVP
 * summary), expanding to full details and the copy-link action
 */

import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, Link2 } from 'lucide-react';
import { AnswerDetails, RsvpCell, StatusBadge } from './shared';
import type { SpeakerLogisticsAdminRow } from './types';

interface SpeakerLogisticsCardListProps {
  speakers: SpeakerLogisticsAdminRow[];
  onCopyLink: (row: SpeakerLogisticsAdminRow) => void;
  onCopyGuideLink: (row: SpeakerLogisticsAdminRow) => void;
}

const EVENT_CHIPS: Array<{
  label: string;
  attendanceKey: 'attending_warmup' | 'attending_speakers_dinner' | 'attending_after_party' | 'attending_speaker_hangout';
  plusOneKey?: 'dinner_plus_one' | 'after_party_plus_one' | 'speaker_hangout_plus_one';
}> = [
  { label: 'Sep 9', attendanceKey: 'attending_warmup' },
  { label: 'Sep 10', attendanceKey: 'attending_speakers_dinner', plusOneKey: 'dinner_plus_one' },
  { label: 'Sep 11', attendanceKey: 'attending_after_party', plusOneKey: 'after_party_plus_one' },
  { label: 'Sep 12', attendanceKey: 'attending_speaker_hangout', plusOneKey: 'speaker_hangout_plus_one' },
];

export function SpeakerLogisticsCardList({ speakers, onCopyLink, onCopyGuideLink }: SpeakerLogisticsCardListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (speakers.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No speakers match the current filter.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {speakers.map((row) => {
        const isExpanded = expandedId === row.speaker_id;
        return (
          <li key={row.speaker_id} className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-gray-950">
                  {row.first_name} {row.last_name}
                </p>
                {row.has_workshop && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                    Workshop
                  </span>
                )}
                <StatusBadge row={row} />
              </div>
              <p className="truncate text-xs text-gray-500">{row.email}</p>

              {/* Compact RSVP summary */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {EVENT_CHIPS.map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-600"
                  >
                    {chip.label}
                    <RsvpCell
                      attending={row.answers?.[chip.attendanceKey]}
                      plusOne={chip.plusOneKey ? row.answers?.[chip.plusOneKey] : undefined}
                    />
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-600">
                  Shirt
                  {row.tshirt_size ? (
                    <span className="font-medium text-gray-800">{row.tshirt_size}</span>
                  ) : (
                    <span className="rounded bg-red-50 px-1 py-0.5 text-[10px] font-medium text-red-700">missing</span>
                  )}
                </span>
              </div>
            </div>

            <button
              onClick={() => setExpandedId(isExpanded ? null : row.speaker_id)}
              aria-expanded={isExpanded}
              className="flex w-full items-center justify-center gap-1 border-t border-gray-100 px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              {isExpanded ? (
                <>
                  Hide details
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                </>
              ) : (
                <>
                  Show details
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </>
              )}
              <span className="sr-only">
                {' '}for {row.first_name} {row.last_name}
              </span>
            </button>

            {isExpanded && (
              <div className="space-y-4 border-t border-gray-100 bg-gray-50 p-4">
                <AnswerDetails row={row} />
                {row.logistics_url && (
                  <button
                    onClick={() => onCopyLink(row)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Link2 className="h-4 w-4" aria-hidden="true" />
                    Copy unique form link
                  </button>
                )}
                {row.speaker_guide && (
                  <>
                    <button
                      onClick={() => onCopyGuideLink(row)}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                      Copy guide link
                    </button>
                    <a
                      href={row.speaker_guide.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      Preview guide
                    </a>
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
