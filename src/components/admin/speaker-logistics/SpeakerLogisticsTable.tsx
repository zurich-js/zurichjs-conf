/**
 * Speaker Logistics Table
 * Per-speaker RSVP reconciliation with expandable detail rows (dietary,
 * plus-one contact, accommodations) and per-speaker link actions
 */

import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Link2, Minus, X } from 'lucide-react';
import type { SpeakerLogisticsAdminRow } from './types';

interface SpeakerLogisticsTableProps {
  speakers: SpeakerLogisticsAdminRow[];
  selectedIds: Set<string>;
  onToggleSelection: (speakerId: string) => void;
  onToggleSelectAll: () => void;
  onCopyLink: (row: SpeakerLogisticsAdminRow) => void;
}

function RsvpCell({ attending, plusOne }: { attending: boolean | null | undefined; plusOne?: boolean | null }) {
  if (attending === true) {
    return (
      <span className="inline-flex items-center gap-1 text-green-700">
        <Check className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Attending</span>
        {plusOne === true && (
          <span className="rounded bg-green-100 px-1 py-0.5 text-[10px] font-semibold leading-none">+1</span>
        )}
      </span>
    );
  }
  if (attending === false) {
    return (
      <span className="inline-flex items-center text-red-600">
        <X className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Not attending</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-gray-300">
      <Minus className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">No answer yet</span>
    </span>
  );
}

function StatusBadge({ row }: { row: SpeakerLogisticsAdminRow }) {
  if (row.status === 'submitted') {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        Submitted
      </span>
    );
  }
  if (row.status === 'requested') {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        Link sent
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      Not contacted
    </span>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-CH', {
    timeZone: 'Europe/Zurich',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function DetailRow({ row }: { row: SpeakerLogisticsAdminRow }) {
  const answers = row.answers;
  return (
    <tr className="bg-gray-50">
      <td colSpan={9} className="px-6 py-4">
        {answers ? (
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div>
              <p className="font-semibold text-gray-900">Dietary restrictions</p>
              <p className="mt-1 text-gray-700">{answers.dietary_restrictions || 'None reported'}</p>
              {answers.dinner_plus_one === true && (
                <>
                  <p className="mt-3 font-semibold text-gray-900">Dinner plus-one dietary restrictions</p>
                  <p className="mt-1 text-gray-700">
                    {answers.dinner_plus_one_dietary_restrictions || 'None reported'}
                  </p>
                </>
              )}
              <p className="mt-3 font-semibold text-gray-900">Talk / workshop accommodations</p>
              <p className="mt-1 text-gray-700">{answers.talk_special_accommodations || 'None requested'}</p>
            </div>
            <div>
              {answers.after_party_plus_one === true ? (
                <>
                  <p className="font-semibold text-gray-900">After-party plus one (VIP ticket needed)</p>
                  <p className="mt-1 text-gray-700">
                    {answers.after_party_plus_one_first_name} {answers.after_party_plus_one_last_name}
                  </p>
                  <p className="text-gray-700">{answers.after_party_plus_one_email}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Issue them a VIP ticket — it includes 20% off workshops.
                  </p>
                </>
              ) : (
                <p className="text-gray-500">No after-party plus one.</p>
              )}
              <p className="mt-3 text-xs text-gray-500">
                Submitted {formatDateTime(row.submitted_at)} · Last updated {formatDateTime(row.updated_at)} ·
                Link sent {formatDateTime(row.request_sent_at)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No answers yet.{' '}
            {row.request_sent_at
              ? `Their unique link was sent ${formatDateTime(row.request_sent_at)}.`
              : 'Their unique link has not been emailed yet — select them and use "Send links".'}
          </p>
        )}
      </td>
    </tr>
  );
}

export function SpeakerLogisticsTable({
  speakers,
  selectedIds,
  onToggleSelection,
  onToggleSelectAll,
  onCopyLink,
}: SpeakerLogisticsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (speakers.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No speakers match the current filter.
      </div>
    );
  }

  const allSelected = speakers.every((row) => selectedIds.has(row.speaker_id));

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th scope="col" className="px-4 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                aria-label="Select all visible speakers"
                className="h-4 w-4 rounded border-gray-300"
              />
            </th>
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
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.speaker_id)}
                      onChange={() => onToggleSelection(row.speaker_id)}
                      aria-label={`Select ${row.first_name} ${row.last_name}`}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </td>
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
                    <RsvpCell attending={row.answers?.attending_speaker_hangout} />
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
                {isExpanded && <DetailRow row={row} />}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
