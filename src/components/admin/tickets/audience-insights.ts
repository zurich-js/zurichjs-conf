import type { Ticket } from '@/components/admin/dashboard/types';

export type AudienceScope = 'confirmed' | 'all';

export interface AudienceDimension {
  label: string;
  count: number;
  percentage: number;
}

export interface AudienceInsights {
  attendeeCount: number;
  companyCount: number;
  countryCount: number;
  roleCount: number;
  vipCount: number;
  companies: AudienceDimension[];
  countries: AudienceDimension[];
  roles: AudienceDimension[];
  ticketTypes: AudienceDimension[];
}

const EMPTY_VALUE = 'Not provided';

function cleanValue(value: string | null | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

export function getTicketCountry(ticket: Ticket): string | null {
  return cleanValue(ticket.metadata?.session_metadata?.country);
}

export function getTicketCity(ticket: Ticket): string | null {
  return cleanValue(ticket.metadata?.session_metadata?.city);
}

export function getTicketRole(ticket: Ticket): string | null {
  return cleanValue(ticket.job_title) ?? cleanValue(ticket.metadata?.session_metadata?.jobTitle);
}

export function getTicketCompany(ticket: Ticket): string | null {
  return cleanValue(ticket.company) ?? cleanValue(ticket.metadata?.session_metadata?.company);
}

export function getTicketType(ticket: Ticket): string {
  return cleanValue(ticket.ticket_category) ?? cleanValue(ticket.ticket_type) ?? EMPTY_VALUE;
}

export function getAudienceTickets(tickets: Ticket[], scope: AudienceScope): Ticket[] {
  return scope === 'confirmed' ? tickets.filter((ticket) => ticket.status === 'confirmed') : tickets;
}

function collate(values: Array<string | null>, total: number): AudienceDimension[] {
  const counts = new Map<string, { label: string; count: number }>();

  for (const value of values) {
    const label = value ?? EMPTY_VALUE;
    const key = label.toLocaleLowerCase();
    const existing = counts.get(key);
    counts.set(key, { label: existing?.label ?? label, count: (existing?.count ?? 0) + 1 });
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map(({ label, count }) => ({
      label,
      count,
      percentage: total === 0 ? 0 : Math.round((count / total) * 100),
    }));
}

export function buildAudienceInsights(tickets: Ticket[]): AudienceInsights {
  const countries = collate(tickets.map(getTicketCountry), tickets.length);
  const roles = collate(tickets.map(getTicketRole), tickets.length);
  const ticketTypes = collate(tickets.map(getTicketType), tickets.length);
  const companies = collate(tickets.map(getTicketCompany), tickets.length);
  const isVip = (ticket: Ticket) => getTicketType(ticket).toLocaleLowerCase().includes('vip');

  return {
    attendeeCount: tickets.length,
    companyCount: companies.filter((item) => item.label !== EMPTY_VALUE).length,
    countryCount: countries.filter((item) => item.label !== EMPTY_VALUE).length,
    roleCount: roles.filter((item) => item.label !== EMPTY_VALUE).length,
    vipCount: tickets.filter(isVip).length,
    companies,
    countries,
    roles,
    ticketTypes,
  };
}

function escapeCsv(value: string | number | null | undefined): string {
  const rawText = value == null ? '' : String(value);
  const text = /^[=+\-@]/.test(rawText) ? `'${rawText}` : rawText;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function ticketsToCsv(tickets: Ticket[]): string {
  const headers = [
    'ticket_id', 'first_name', 'last_name', 'email', 'company', 'role', 'country', 'city',
    'ticket_type', 'ticket_stage', 'status', 'amount_paid', 'currency', 'created_at',
  ];
  const rows = tickets.map((ticket) => [
    ticket.id,
    ticket.first_name,
    ticket.last_name,
    ticket.email,
    getTicketCompany(ticket),
    getTicketRole(ticket),
    getTicketCountry(ticket),
    getTicketCity(ticket),
    getTicketType(ticket),
    ticket.ticket_stage,
    ticket.status,
    ticket.amount_paid / 100,
    ticket.currency,
    ticket.created_at,
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
}

export function rolesForClipboard(tickets: Ticket[]): string {
  const roleCounts = collate(tickets.map(getTicketRole).filter((role): role is string => Boolean(role)), tickets.length);
  return roleCounts.map((role) => `${role.label} (${role.count})`).join('\n');
}

export function personResearchUrl(ticket: Ticket): string {
  const name = `${ticket.first_name} ${ticket.last_name}`.trim();
  const company = getTicketCompany(ticket);
  const query = `"${name}"${company ? ` "${company}"` : ''} (conference speaker OR open source maintainer)`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
