import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConferenceReportingClient } from '../conference-reporting';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ConferenceReportingClient', () => {
  it('aggregates ticket sales without returning attendee data', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      tickets: [
        {
          status: 'confirmed',
          amount_paid: 29500,
          currency: 'CHF',
          ticket_type: 'standard',
          ticket_category: 'standard',
          ticket_stage: 'late_bird',
          stripe_session_id: 'cs_1',
          metadata: {},
          created_at: '2026-08-22T10:00:00Z',
          email: 'attendee@example.com',
        },
        {
          status: 'confirmed',
          amount_paid: 0,
          currency: 'CHF',
          ticket_type: 'vip',
          ticket_category: 'vip',
          ticket_stage: 'late_bird',
          stripe_session_id: 'b2b_1',
          metadata: { isB2B: true },
          created_at: '2026-08-23T10:00:00Z',
          email: 'vip@example.com',
        },
      ],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    const reporting = new ConferenceReportingClient({
      baseUrl: 'https://conf.zurichjs.com',
      adminApiKey: 'admin-readonly-key',
    });

    const result = await reporting.getTicketSales('2026-08-23T00:00:00Z');

    expect(result.summary).toMatchObject({
      confirmedTickets: 2,
      complimentaryTickets: 1,
      b2bTickets: 1,
      revenueByCurrency: { CHF: 29500 },
    });
    expect(result.salesSince).toEqual([
      { date: '2026-08-23', count: 1, revenueByCurrency: { CHF: 0 } },
    ]);
    expect(JSON.stringify(result)).not.toContain('attendee@example.com');
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://conf.zurichjs.com/api/admin/tickets'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-readonly-key',
        }),
      }),
    );
  });
});
