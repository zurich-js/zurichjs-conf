/**
 * Shared presentational pieces for the after-party admin views
 * (mobile card list + desktop table)
 */

import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
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

export function TicketStatus({ attendee }: { attendee: AfterPartyAttendee }) {
  if (attendee.ticket) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        VIP ticket{attendee.ticket.complimentary ? ' (comp)' : ''}
        {attendee.ticket.checked_in ? ' · checked in' : ''}
      </span>
    );
  }
  if (attendee.needs_vip_ticket) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        VIP ticket not issued yet
      </span>
    );
  }
  return <span className="text-xs text-gray-400">No ticket needed</span>;
}

/** Secondary facts about a person: who brought them, guest type, company, notes */
export function attendeeDetailParts(attendee: AfterPartyAttendee): string[] {
  const parts: string[] = [];
  if (attendee.related_speaker_name) parts.push(`Plus one of ${attendee.related_speaker_name}`);
  if (attendee.guest_type && attendee.guest_type !== 'speaker_plus_one') {
    parts.push(ACTIVITY_GUEST_TYPE_LABELS[attendee.guest_type as ActivityGuestType] ?? attendee.guest_type);
  }
  if (attendee.ticket?.company) parts.push(attendee.ticket.company);
  if (attendee.speaker_declined) parts.push('Declined the after party in their logistics form');
  if (attendee.dietary_restrictions) parts.push(`Dietary: ${attendee.dietary_restrictions}`);
  if (attendee.notes) parts.push(attendee.notes);
  return parts;
}

export function AttendeeDetails({ attendee }: { attendee: AfterPartyAttendee }) {
  const parts = attendeeDetailParts(attendee);
  if (parts.length === 0) return null;
  return <p className="mt-0.5 text-xs text-gray-500">{parts.join(' · ')}</p>;
}
