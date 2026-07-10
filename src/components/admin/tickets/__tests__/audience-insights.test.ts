import { describe, expect, it } from 'vitest';
import type { Ticket } from '@/components/admin/dashboard/types';
import {
  buildAudienceInsights,
  getAudienceTickets,
  personResearchUrl,
  rolesForClipboard,
  ticketsToCsv,
} from '../audience-insights';

const ticket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 'ticket-1',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  ticket_type: 'conference',
  ticket_category: 'standard',
  ticket_stage: 'early_bird',
  amount_paid: 29900,
  currency: 'CHF',
  status: 'confirmed',
  company: 'Analytical Engines, Inc.',
  job_title: 'Principal Engineer',
  metadata: { session_metadata: { country: 'Switzerland', city: 'Zurich' } },
  ...overrides,
});

describe('audience insights', () => {
  it('collates dimensions case-insensitively and counts VIP access', () => {
    const insights = buildAudienceInsights([
      ticket(),
      ticket({ id: 'ticket-2', company: 'analytical engines, inc.', ticket_category: 'vip', metadata: { session_metadata: { country: 'switzerland' } } }),
      ticket({ id: 'ticket-3', job_title: 'Developer', company: 'Other Co', metadata: {} }),
    ]);

    expect(insights.attendeeCount).toBe(3);
    expect(insights.vipCount).toBe(1);
    expect(insights.companyCount).toBe(2);
    expect(insights.companies[0]).toMatchObject({ label: 'Analytical Engines, Inc.', count: 2 });
    expect(insights.countries[0]).toMatchObject({ label: 'Switzerland', count: 2, percentage: 67 });
    expect(insights.roles).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Principal Engineer', count: 2 }),
      expect.objectContaining({ label: 'Developer', count: 1 }),
    ]));
  });

  it('defaults the audience scope to confirmed ticket holders', () => {
    const tickets = [ticket(), ticket({ id: 'ticket-2', status: 'cancelled' })];
    expect(getAudienceTickets(tickets, 'confirmed')).toHaveLength(1);
    expect(getAudienceTickets(tickets, 'all')).toHaveLength(2);
  });

  it('creates spreadsheet-safe CSV and a counted role list', () => {
    const tickets = [ticket(), ticket({ id: 'ticket-2', first_name: '=SUM(A1)', job_title: 'Principal Engineer' })];
    const csv = ticketsToCsv(tickets);

    expect(csv).toContain('ticket_id,first_name,last_name,email');
    expect(csv).toContain('"Analytical Engines, Inc."');
    expect(csv).toContain("'=SUM(A1)");
    expect(rolesForClipboard(tickets)).toBe('Principal Engineer (2)');
  });

  it('builds a targeted, encoded research search', () => {
    const url = personResearchUrl(ticket());
    expect(url).toMatch(/^https:\/\/www\.google\.com\/search\?q=/);
    expect(decodeURIComponent(url)).toContain('"Ada Lovelace"');
    expect(decodeURIComponent(url)).toContain('open source maintainer');
  });
});
