/**
 * Speaker Logistics Table (desktop)
 * Per-speaker RSVP reconciliation with expandable detail rows (dietary,
 * plus-one contact, accommodations) and a copy-link action per speaker
 */

import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, Link2 } from 'lucide-react';
import { AnswerDetails, RsvpCell, StatusBadge } from './shared';
import type { SpeakerLogisticsAdminRow } from './types';

interface SpeakerLogisticsTableProps {
  speakers: SpeakerLogisticsAdminRow[];
  onCopyLink: (row: SpeakerLogisticsAdminRow) => void;
  onCopyGuideLink: (row: SpeakerLogisticsAdminRow) => void;
}

export function SpeakerLogisticsTable({ speakers, onCopyLink, onCopyGuideLink }: SpeakerLogisticsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (speakers.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No speakers match the current filter.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Mobile Card View */}
      <div className="lg:hidden divide-y divide-gray-200">
        {speakers.map((row) => {
          const isExpanded = expandedId === row.speaker_id;
          return (
            <div key={row.speaker_id} className={isExpanded ? 'bg-gray-50' : ''}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-950">
                      {row.first_name} {row.last_name}
                      {row.has_workshop && (
                        <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                          Workshop
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{row.email}</p>
                  </div>
                  <StatusBadge row={row} />
                </div>

                {/* RSVP Grid */}
                <div className="grid grid-cols-4 gap-2 text-center mb-3">
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">Sep 9</p>
                    <RsvpCell attending={row.answers?.attending_warmup} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">Sep 10</p>
                    <RsvpCell attending={row.answers?.attending_speakers_dinner} plusOne={row.answers?.dinner_plus_one} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">Sep 11</p>
                    <RsvpCell attending={row.answers?.attending_after_party} plusOne={row.answers?.after_party_plus_one} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">Sep 12</p>
                    <RsvpCell attending={row.answers?.attending_speaker_hangout} plusOne={row.answers?.speaker_hangout_plus_one} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-gray-500">Shirt: </span>
                    {row.tshirt_size ? (
                      <span className="text-gray-700">{row.tshirt_size}</span>
                    ) : (
                      <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">missing</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {row.logistics_url && (
                      <button
                        onClick={() => onCopyLink(row)}
                        className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        title="Copy form link"
                      >
                        <Link2 className="h-5 w-5" aria-hidden="true" />
                        <span className="sr-only">Copy logistics link</span>
                      </button>
                    )}
                    {row.speaker_guide && (
                      <button
                        onClick={() => onCopyGuideLink(row)}
                        className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        title="Copy guide link"
                      >
                        <BookOpen className="h-5 w-5" aria-hidden="true" />
                        <span className="sr-only">Copy guide link</span>
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : row.speaker_id)}
                      className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-5 w-5" aria-hidden="true" />
                      )}
                      <span className="sr-only">{isExpanded ? 'Hide' : 'Show'} details</span>
                    </button>
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4">
                  <AnswerDetails row={row} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
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
                        {row.speaker_guide && (
                          <>
                            <button
                              onClick={() => onCopyGuideLink(row)}
                              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                              title="Copy personalized guide link"
                            >
                              <BookOpen className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">
                                Copy personalized guide link for {row.first_name} {row.last_name}
                              </span>
                            </button>
                            <a
                              href={row.speaker_guide.path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                              title="Preview personalized guide"
                            >
                              <ExternalLink className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">
                                Preview personalized guide for {row.first_name} {row.last_name}
                              </span>
                            </a>
                          </>
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
    </div>
  );
}
