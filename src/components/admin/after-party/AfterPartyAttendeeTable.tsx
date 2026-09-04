/**
 * After Party Attendee Table
 * Who exactly is expected — one row per person, with every source they came
 * from and whether their VIP ticket exists yet.
 */

import React from 'react';
import { AlertCircle, CheckCircle2, PartyPopper } from 'lucide-react';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { AFTER_PARTY_SOURCE_LABELS } from '@/lib/after-party';
import { ACTIVITY_GUEST_TYPE_LABELS, type ActivityGuestType } from '@/lib/types/speaker-logistics';
import type { AfterPartyAttendee, AfterPartySource } from './types';

const SOURCE_BADGE_CLASSES: Record<AfterPartySource, string> = {
  speaker: 'bg-brand-primary/20 text-gray-900',
  speaker_plus_one: 'bg-green-100 text-green-800',
  activity_guest: 'bg-blue-100 text-blue-800',
  vip_ticket: 'bg-purple-100 text-purple-800',
};

export function SourceBadge({ source }: { source: AfterPartySource }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_BADGE_CLASSES[source]}`}>
      {AFTER_PARTY_SOURCE_LABELS[source]}
    </span>
  );
}

function TicketStatus({ attendee }: { attendee: AfterPartyAttendee }) {
  if (attendee.ticket) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        VIP ticket{attendee.ticket.complimentary ? ' (comp)' : ''}
        {attendee.ticket.checked_in ? ' · checked in' : ''}
      </span>
    );
  }
  if (attendee.needs_vip_ticket) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
        VIP ticket not issued yet
      </span>
    );
  }
  return <span className="text-xs text-gray-400">—</span>;
}

function AttendeeDetails({ attendee }: { attendee: AfterPartyAttendee }) {
  const parts: string[] = [];
  if (attendee.related_speaker_name) parts.push(`Plus one of ${attendee.related_speaker_name}`);
  if (attendee.guest_type && attendee.guest_type !== 'speaker_plus_one') {
    parts.push(ACTIVITY_GUEST_TYPE_LABELS[attendee.guest_type as ActivityGuestType] ?? attendee.guest_type);
  }
  if (attendee.ticket?.company) parts.push(attendee.ticket.company);
  if (attendee.speaker_declined) parts.push('Declined the after party in their logistics form');
  if (attendee.dietary_restrictions) parts.push(`Dietary: ${attendee.dietary_restrictions}`);
  if (attendee.notes) parts.push(attendee.notes);
  if (parts.length === 0) return null;
  return <p className="mt-0.5 text-xs text-gray-500">{parts.join(' · ')}</p>;
}

interface AfterPartyAttendeeTableProps {
  attendees: AfterPartyAttendee[];
  totalCount: number;
}

export function AfterPartyAttendeeTable({ attendees, totalCount }: AfterPartyAttendeeTableProps) {
  if (attendees.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <AdminEmptyState
          icon={<PartyPopper className="h-6 w-6" aria-hidden="true" />}
          title={totalCount === 0 ? 'Nobody on the list yet' : 'No one matches this filter'}
          description={
            totalCount === 0
              ? 'Speakers who RSVP yes, their plus ones, admin-added guests, and VIP ticket holders will show up here.'
              : 'Try another filter or clear the search.'
          }
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th scope="col" className="px-4 py-3">
              Name
            </th>
            <th scope="col" className="px-4 py-3">
              Email
            </th>
            <th scope="col" className="px-4 py-3">
              Source
            </th>
            <th scope="col" className="px-4 py-3">
              Ticket
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {attendees.map((attendee) => (
            <tr key={attendee.key} className="align-top hover:bg-gray-50">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">
                  {attendee.first_name} {attendee.last_name}
                </p>
                <AttendeeDetails attendee={attendee} />
              </td>
              <td className="break-all px-4 py-3 text-gray-700">{attendee.email ?? <span className="text-gray-400">—</span>}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {attendee.sources.map((source) => (
                    <SourceBadge key={source} source={source} />
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <TicketStatus attendee={attendee} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
