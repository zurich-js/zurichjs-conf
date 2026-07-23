/**
 * Apparel Tickets Table
 * Ticket holders with their apparel size status, selection checkboxes,
 * and last-reminded timestamps
 */

import React from 'react';
import { Sparkles, Check, Minus } from 'lucide-react';
import type { ApparelTicketRow } from './types';

interface ApparelTicketsTableProps {
  tickets: ApparelTicketRow[];
  selectedIds: Set<string>;
  onToggleSelection: (ticketId: string) => void;
  onToggleSelectAll: () => void;
}

function formatReminderDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SizeCell({ size, applicable }: { size: string | null; applicable: boolean }) {
  if (!applicable) {
    return (
      <span className="inline-flex items-center text-gray-300">
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">Not applicable</span>
      </span>
    );
  }
  if (!size) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
        Missing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <Check className="h-3 w-3" aria-hidden="true" />
      {size}
    </span>
  );
}

export function ApparelTicketsTable({
  tickets,
  selectedIds,
  onToggleSelection,
  onToggleSelectAll,
}: ApparelTicketsTableProps) {
  const allSelected = tickets.length > 0 && tickets.every((ticket) => selectedIds.has(ticket.id));

  if (tickets.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-500">
        No tickets match the current filter.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-2 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Select all visible tickets"
                  className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                />
              </th>
              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Attendee</th>
              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ticket</th>
              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">T-Shirt</th>
              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hoodie</th>
              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Reminded</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tickets.map((ticket) => {
              const isVip = ticket.ticket_category === 'vip';
              return (
                <tr key={ticket.id} className={selectedIds.has(ticket.id) ? 'bg-blue-50/50' : undefined}>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(ticket.id)}
                      onChange={() => onToggleSelection(ticket.id)}
                      aria-label={`Select ${ticket.first_name} ${ticket.last_name}`}
                      className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <p className="font-medium text-gray-900">
                      {ticket.first_name} {ticket.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{ticket.email}</p>
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1 capitalize text-gray-700">
                      {isVip && <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />}
                      {ticket.ticket_category}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <SizeCell size={ticket.tshirt_size} applicable />
                  </td>
                  <td className="px-4 py-2">
                    <SizeCell size={ticket.hoodie_size} applicable={isVip} />
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {formatReminderDate(ticket.apparel_reminder_sent_at)}
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
