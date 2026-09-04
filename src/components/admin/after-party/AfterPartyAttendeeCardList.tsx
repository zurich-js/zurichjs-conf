/**
 * After Party Attendee Card List (mobile default)
 * One compact card per person: name, source badges, ticket status, and the
 * secondary facts (who brought them, guest type, dietary) as short lines.
 */

import React from 'react';
import { PartyPopper } from 'lucide-react';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { SourceBadge, TicketStatus, attendeeDetailParts } from './shared';
import type { AfterPartyAttendee } from './types';

export interface AfterPartyAttendeeCardListProps {
  attendees: AfterPartyAttendee[];
  totalCount: number;
}

export function AfterPartyEmptyState({ totalCount }: { totalCount: number }): React.JSX.Element {
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

export function AfterPartyAttendeeCardList({ attendees, totalCount }: AfterPartyAttendeeCardListProps): React.JSX.Element {
  if (attendees.length === 0) return <AfterPartyEmptyState totalCount={totalCount} />;

  return (
    <ul className="space-y-2">
      {attendees.map((attendee) => {
        const details = attendeeDetailParts(attendee);
        return (
          <li key={attendee.key} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-950">
                  {attendee.first_name} {attendee.last_name}
                </p>
                {attendee.email && <p className="truncate text-xs text-gray-500">{attendee.email}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {attendee.sources.map((source) => (
                  <SourceBadge key={source} source={source} />
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <TicketStatus attendee={attendee} />
            </div>

            {details.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-gray-500">
                {details.map((part) => (
                  <li key={part}>{part}</li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
