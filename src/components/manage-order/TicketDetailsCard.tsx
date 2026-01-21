/**
 * Ticket Details Card
 * Displays ticket information
 */

import { Sparkles } from 'lucide-react';
import { formatAmount, formatDate, getStatusColor, getStatusLabel } from './utils';
import type { TicketData } from './types';

interface TicketDetailsCardProps {
  ticket: TicketData;
}

export function TicketDetailsCard({ ticket }: TicketDetailsCardProps) {
  return (
    <div className="bg-black rounded-2xl p-8 mb-8">
      <h2 className="text-xl font-bold text-brand-primary mb-6">Ticket Details</h2>

      <div className="space-y-4">
        <DetailRow label="Ticket ID" value={ticket.id.slice(0, 8).toUpperCase()} mono />
        <DetailRow label="Attendee Name" value={`${ticket.first_name} ${ticket.last_name}`} />
        <DetailRow label="Email" value={ticket.email} />
        {ticket.company && <DetailRow label="Company" value={ticket.company} />}
        {ticket.job_title && <DetailRow label="Job Title" value={ticket.job_title} />}

        <div className="flex justify-between items-center py-3 border-b border-gray-800">
          <span className="text-gray-400">Ticket Type</span>
          <span className="text-brand-white capitalize flex items-center gap-2">
            {ticket.ticket_category === 'vip' && (
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                VIP
              </span>
            )}
            {ticket.ticket_category} - {ticket.ticket_stage.replace('_', ' ')}
          </span>
        </div>

        <DetailRow label="Amount Paid" value={formatAmount(ticket.amount_paid, ticket.currency)} bold />
        <DetailRow label="Purchase Date" value={formatDate(ticket.created_at)} />

        <div className="flex justify-between items-center py-3">
          <span className="text-gray-400">Status</span>
          <span className={`font-semibold ${getStatusColor(ticket.status)}`}>{getStatusLabel(ticket.status)}</span>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-800">
      <span className="text-gray-400">{label}</span>
      <span className={`text-brand-white ${mono ? 'font-mono text-sm' : ''} ${bold ? 'font-semibold' : ''}`}>
        {value}
      </span>
    </div>
  );
}
