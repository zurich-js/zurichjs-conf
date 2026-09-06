/**
 * After Party Attendee Table (large screens)
 * Who exactly is expected — one row per person, with every source they came
 * from and whether their VIP ticket exists yet.
 */

import React from 'react';
import { AfterPartyEmptyState } from './AfterPartyAttendeeCardList';
import { AttendeeDetails, SourceBadge, TicketStatus } from './shared';
import type { AfterPartyAttendee } from './types';

export interface AfterPartyAttendeeTableProps {
  attendees: AfterPartyAttendee[];
  totalCount: number;
}

export function AfterPartyAttendeeTable({ attendees, totalCount }: AfterPartyAttendeeTableProps): React.JSX.Element {
  if (attendees.length === 0) return <AfterPartyEmptyState totalCount={totalCount} />;

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
              <td className="break-all px-4 py-3 text-gray-700">
                {attendee.email ?? <span className="text-gray-400">—</span>}
              </td>
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
