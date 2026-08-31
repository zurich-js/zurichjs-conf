/**
 * Badge CSV Export
 *
 * Generates a CSV file for badge production with attendee details:
 * - Full name
 * - Role @ Company
 * - Badge label (VIP or Attendee)
 * - QR code URL
 */

import type { Ticket } from '@/components/admin/dashboard/types';
import {
  getTicketCompany,
  getTicketRole,
} from './audience-insights';

export interface BadgeRow {
  ticket_id: string;
  full_name: string;
  role_company: string;
  badge_label: string;
  qr_code_url: string;
  email: string;
}

/**
 * Escape a value for CSV output.
 * Handles special characters and formula injection prevention.
 */
function escapeCsv(value: string | null | undefined): string {
  const rawText = value == null ? '' : String(value);
  const text = /^[=+\-@]/.test(rawText) ? `'${rawText}` : rawText;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Get the badge label for a ticket.
 * - VIP tickets get "VIP"
 * - All other categories (standard, student, unemployed) get "Attendee"
 */
export function getBadgeLabel(ticket: Ticket): string {
  const category = ticket.ticket_category?.toLowerCase();
  return category === 'vip' ? 'VIP' : 'Attendee';
}

/**
 * Format role and company as "Role @ Company".
 * Handles missing values gracefully:
 * - Both present: "Role @ Company"
 * - Only role: "Role"
 * - Only company: "@ Company"
 * - Neither: empty string
 */
export function formatRoleCompany(ticket: Ticket): string {
  const role = getTicketRole(ticket);
  const company = getTicketCompany(ticket);

  if (role && company) {
    return `${role} @ ${company}`;
  }
  if (role) {
    return role;
  }
  if (company) {
    return `@ ${company}`;
  }
  return '';
}

/**
 * Convert a ticket to a badge row.
 */
export function ticketToBadgeRow(ticket: Ticket): BadgeRow {
  return {
    ticket_id: ticket.id,
    full_name: `${ticket.first_name} ${ticket.last_name}`.trim(),
    role_company: formatRoleCompany(ticket),
    badge_label: getBadgeLabel(ticket),
    qr_code_url: ticket.qr_code_url ?? '',
    email: ticket.email,
  };
}

/**
 * Convert tickets to badge CSV format.
 * Only includes confirmed tickets by default.
 */
export function ticketsToBadgeCsv(tickets: Ticket[], confirmedOnly = true): string {
  const filteredTickets = confirmedOnly
    ? tickets.filter((t) => t.status === 'confirmed')
    : tickets;

  const headers = [
    'ticket_id',
    'full_name',
    'role_company',
    'badge_label',
    'qr_code_url',
    'email',
  ];

  const rows = filteredTickets.map((ticket) => {
    const badgeRow = ticketToBadgeRow(ticket);
    return [
      badgeRow.ticket_id,
      badgeRow.full_name,
      badgeRow.role_company,
      badgeRow.badge_label,
      badgeRow.qr_code_url,
      badgeRow.email,
    ];
  });

  return [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
}

/**
 * Trigger a download of the badge CSV.
 */
export function downloadBadgeCsv(tickets: Ticket[], confirmedOnly = true): void {
  const csv = ticketsToBadgeCsv(tickets, confirmedOnly);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `zurichjs-badges-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
