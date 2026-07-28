/**
 * Speaker Logistics Table (desktop)
 * Per-speaker RSVP reconciliation with expandable detail rows (dietary,
 * plus-one contact, accommodations) and a copy-link action per speaker
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Link2 } from 'lucide-react';
import { AnswerDetails, RsvpCell, StatusBadge } from './shared';
import type { SpeakerLogisticsAdminRow } from './types';

interface SpeakerLogisticsTableProps {
  speakers: SpeakerLogisticsAdminRow[];
  onCopyLink: (row: SpeakerLogisticsAdminRow) => void;
}

export function SpeakerLogisticsTable({ speakers, onCopyLink }: SpeakerLogisticsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (speakers.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No speakers match the current filter.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th scope="col" className="px-4 py-3">Speaker</th>
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3 text-center" title="Warm-Up Meetup, Sep 9">Sep 9</th>
            <th scope="col" className="px-4 py-3 text-center" title="Speakers Dinner, Sep 10">Sep 10</th>
            <th scope="col" className="px-4 py-3 text-center" title="VIP After Party, Sep 11">Sep 11</th>
            <th scope="col" className="px-4 py-3 text-center" title="Speaker Hangout, Sep 12">Sep 12</th>
            <th scope="col" className="px-4 py-3 text-center">Shirt</th>
            <th scope="col" className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {speakers.map((row) => {
            const isExpanded = expandedId === row.speaker_id;
            return (
              <React.Fragment key={row.speaker_id}>
                <tr className={isExpanded ? 'bg-gray-50' : undefined}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-950">
                      {row.first_name} {row.last_name}
                      {row.has_workshop && (
                        <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                          Workshop
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{row.email}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge row={row} /></td>
                  <td className="px-4 py-3 text-center">
                    <RsvpCell attending={row.answers?.attending_warmup} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <RsvpCell attending={row.answers?.attending_speakers_dinner} plusOne={row.answers?.dinner_plus_one} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <RsvpCell attending={row.answers?.attending_after_party} plusOne={row.answers?.after_party_plus_one} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <RsvpCell attending={row.answers?.attending_speaker_hangout} plusOne={row.answers?.speaker_hangout_plus_one} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.tshirt_size ? (
                      <span className="text-gray-700">{row.tshirt_size}</span>
                    ) : (
                      <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">missing</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {row.logistics_url && (
                        <button
                          onClick={() => onCopyLink(row)}
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                          title="Copy unique form link"
                        >
                          <Link2 className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">
                            Copy logistics link for {row.first_name} {row.last_name}
                          </span>
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : row.speaker_id)}
                        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        )}
                        <span className="sr-only">
                          {isExpanded ? 'Hide' : 'Show'} details for {row.first_name} {row.last_name}
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-gray-50">
                    <td colSpan={8} className="px-6 py-4">
                      <AnswerDetails row={row} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
