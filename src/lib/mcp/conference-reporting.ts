import { z } from 'zod';
import { fetchWithRetry } from '@/lib/retry';

const unknownRecordSchema = z.record(z.string(), z.unknown());

const ticketsSchema = z.object({
  tickets: z.array(z.object({
    status: z.string(),
    amount_paid: z.number(),
    currency: z.string().nullable(),
    ticket_type: z.string(),
    ticket_category: z.string(),
    ticket_stage: z.string(),
    stripe_session_id: z.string().nullable(),
    // A single row with non-object JSON metadata must not fail the whole brief.
    metadata: unknownRecordSchema.nullable().catch(null),
    created_at: z.string(),
  }).passthrough()),
});

const sponsorshipStatsSchema = z.object({
  totalSponsors: z.number(),
  totalDeals: z.number(),
  dealsByStatus: z.record(z.string(), z.number()),
  dealsByTier: z.record(z.string(), z.number()),
  revenueByCurrency: z.record(z.string(), z.object({
    paid: z.number(),
    pending: z.number(),
  })),
  publicLogos: z.number(),
});

const sponsorshipDealsSchema = z.object({
  deals: z.array(z.object({
    deal_number: z.string(),
    status: z.string(),
    currency: z.string(),
    updated_at: z.string(),
    offer_sent_at: z.string().nullable(),
    invoiced_at: z.string().nullable(),
    invoice_sent_at: z.string().nullable(),
    paid_at: z.string().nullable(),
    sponsor: z.object({ company_name: z.string() }),
    tier: z.object({ name: z.string() }),
    invoice: z.object({ total_amount: z.number() }).nullable(),
  }).passthrough()),
  total: z.number(),
});

const speakerLogisticsSchema = z.object({
  stats: unknownRecordSchema,
  speakers: z.array(z.object({
    first_name: z.string(),
    last_name: z.string(),
    tshirt_size: z.string().nullable(),
    has_workshop: z.boolean(),
    status: z.enum(['pending', 'submitted']),
    submitted_at: z.string().nullable(),
    updated_at: z.string().nullable(),
    answers: z.object({
      talk_special_accommodations: z.string().nullable(),
    }).passthrough().nullable(),
  }).passthrough()),
});

const workshopsSchema = z.object({
  items: z.array(z.object({
    submissionTitle: z.string(),
    submissionStatus: z.string(),
    speakerName: z.string().nullable(),
    registrantCount: z.number(),
    revenueByCurrency: z.array(z.object({
      currency: z.string(),
      grossCents: z.number(),
      registrations: z.number(),
    })),
    offering: z.object({
      id: z.string(),
      title: z.string(),
      status: z.string(),
      date: z.string().nullable(),
      start_time: z.string().nullable(),
      end_time: z.string().nullable(),
      room: z.string().nullable(),
      capacity: z.number(),
      enrolled_count: z.number(),
      updated_at: z.string(),
    }).passthrough().nullable(),
  })),
});

export interface ConferenceReportingConfig {
  baseUrl?: string;
  adminApiKey?: string;
}

export class ConferenceReportingClient {
  private readonly baseUrl: string;
  private readonly adminApiKey: string;

  constructor(config: ConferenceReportingConfig = {}) {
    this.baseUrl = normalizeBaseUrl(
      config.baseUrl
        ?? process.env.ZURICHJS_INTERNAL_API_BASE_URL
        ?? 'https://conf.zurichjs.com',
    );
    this.adminApiKey = config.adminApiKey ?? process.env.ADMIN_READONLY_API_KEY ?? '';
  }

  async getTicketSales(since?: string): Promise<Record<string, unknown>> {
    const { tickets } = ticketsSchema.parse(await this.fetchAdmin('/api/admin/tickets'));
    const cutoff = since ? Date.parse(since) : Number.NEGATIVE_INFINITY;
    const confirmedTickets = tickets.filter((ticket) => ticket.status === 'confirmed');
    const byStatus = countBy(tickets, (ticket) => ticket.status);
    const byType = countBy(confirmedTickets, (ticket) => ticket.ticket_type);
    const byCategory = countBy(confirmedTickets, (ticket) => ticket.ticket_category);
    const byStage = countBy(confirmedTickets, (ticket) => ticket.ticket_stage);
    const revenueByCurrency = sumMoneyByCurrency(confirmedTickets);
    const refundedByCurrency = sumMoneyByCurrency(
      tickets.filter((ticket) => ticket.status === 'refunded'),
    );

    const dailySales = Object.values(
      confirmedTickets.reduce<Record<string, { date: string; count: number; revenueByCurrency: Record<string, number> }>>(
        (days, ticket) => {
          const date = ticket.created_at.slice(0, 10);
          const currency = ticket.currency?.toUpperCase() || 'CHF';
          const day = days[date] ?? { date, count: 0, revenueByCurrency: {} };
          day.count += 1;
          day.revenueByCurrency[currency] =
            (day.revenueByCurrency[currency] ?? 0) + ticket.amount_paid;
          days[date] = day;
          return days;
        },
        {},
      ),
    ).sort((left, right) => left.date.localeCompare(right.date));

    const salesSince = dailySales.filter(
      (point) => Date.parse(`${point.date}T00:00:00Z`) >= cutoff,
    );

    const complimentary = confirmedTickets.filter((ticket) => ticket.amount_paid === 0).length;
    const b2b = confirmedTickets.filter((ticket) =>
      ticket.stripe_session_id?.startsWith('b2b_') || ticket.metadata?.isB2B === true,
    ).length;

    return {
      asOf: new Date().toISOString(),
      summary: {
        totalTickets: tickets.length,
        confirmedTickets: confirmedTickets.length,
        cancelledTickets: byStatus.cancelled ?? 0,
        refundedTickets: byStatus.refunded ?? 0,
        pendingTickets: byStatus.pending ?? 0,
        complimentaryTickets: complimentary,
        b2bTickets: b2b,
        revenueByCurrency,
        refundedByCurrency,
      },
      byStatus,
      byType,
      byCategory,
      byStage,
      salesSince,
    };
  }

  async getSponsorProgress(): Promise<Record<string, unknown>> {
    const [statsPayload, dealsPayload] = await Promise.all([
      this.fetchAdmin('/api/admin/sponsorships/stats'),
      this.fetchAdmin('/api/admin/sponsorships/deals?limit=100'),
    ]);
    const stats = sponsorshipStatsSchema.parse(statsPayload);
    const deals = sponsorshipDealsSchema.parse(dealsPayload);

    return {
      asOf: new Date().toISOString(),
      stats,
      deals: deals.deals.map((deal) => ({
        dealNumber: deal.deal_number,
        company: deal.sponsor.company_name,
        tier: deal.tier.name,
        status: deal.status,
        currency: deal.currency,
        invoiceTotal: deal.invoice?.total_amount ?? null,
        updatedAt: deal.updated_at,
        offerSentAt: deal.offer_sent_at,
        invoicedAt: deal.invoiced_at,
        invoiceSentAt: deal.invoice_sent_at,
        paidAt: deal.paid_at,
      })),
      total: deals.total,
    };
  }

  async getSpeakerLogistics(): Promise<Record<string, unknown>> {
    const payload = speakerLogisticsSchema.parse(
      await this.fetchAdmin('/api/admin/speaker-logistics'),
    );
    const nameOf = (speaker: (typeof payload.speakers)[number]) =>
      `${speaker.first_name} ${speaker.last_name}`.trim();

    return {
      asOf: new Date().toISOString(),
      stats: payload.stats,
      pendingSpeakers: payload.speakers.filter((speaker) => speaker.status === 'pending').map(nameOf),
      missingTshirtSize: payload.speakers.filter((speaker) => !speaker.tshirt_size).map(nameOf),
      talkAccommodationFollowups: payload.speakers
        .filter((speaker) => Boolean(speaker.answers?.talk_special_accommodations))
        .map(nameOf),
      workshopSpeakers: payload.speakers.filter((speaker) => speaker.has_workshop).map(nameOf),
      latestUpdates: payload.speakers
        .filter((speaker) => speaker.updated_at)
        .map((speaker) => ({ speaker: nameOf(speaker), updatedAt: speaker.updated_at }))
        .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
        .slice(0, 10),
    };
  }

  async getWorkshopStatus(): Promise<Record<string, unknown>> {
    const payload = workshopsSchema.parse(await this.fetchAdmin('/api/admin/workshops'));

    return {
      asOf: new Date().toISOString(),
      workshops: payload.items.map((item) => {
        const capacity = item.offering?.capacity ?? null;
        const remainingSeats = capacity === null ? null : capacity - item.registrantCount;
        return {
          title: item.offering?.title ?? item.submissionTitle,
          speaker: item.speakerName,
          submissionStatus: item.submissionStatus,
          offeringStatus: item.offering?.status ?? 'missing',
          date: item.offering?.date ?? null,
          startTime: item.offering?.start_time ?? null,
          endTime: item.offering?.end_time ?? null,
          room: item.offering?.room ?? null,
          capacity,
          registrants: item.registrantCount,
          remainingSeats,
          oversold: remainingSeats !== null && remainingSeats < 0,
          revenueByCurrency: item.revenueByCurrency,
          updatedAt: item.offering?.updated_at ?? null,
        };
      }),
    };
  }

  getMilestones(): Record<string, unknown> {
    const now = Date.now();
    const milestones = [
      { name: 'Community warm-up', date: '2026-09-09' },
      { name: 'Workshop day and speaker dinner', date: '2026-09-10' },
      { name: 'Conference day and after-party', date: '2026-09-11' },
    ].map((milestone) => ({
      ...milestone,
      daysRemaining: Math.ceil((Date.parse(`${milestone.date}T00:00:00+02:00`) - now) / 86_400_000),
    }));

    return { asOf: new Date().toISOString(), milestones };
  }

  async getConferenceSnapshot(since?: string): Promise<Record<string, unknown>> {
    const [ticketSales, sponsorProgress, speakerLogistics, workshopStatus] = await Promise.all([
      this.getTicketSales(since),
      this.getSponsorProgress(),
      this.getSpeakerLogistics(),
      this.getWorkshopStatus(),
    ]);

    return {
      asOf: new Date().toISOString(),
      ticketSales,
      sponsorProgress,
      speakerLogistics,
      workshopStatus,
      milestones: this.getMilestones(),
    };
  }

  private async fetchAdmin(path: string): Promise<unknown> {
    if (!this.adminApiKey) {
      throw new Error('ADMIN_READONLY_API_KEY is not configured');
    }

    const response = await fetchWithRetry(
      new URL(path, this.baseUrl),
      {
        headers: {
          Authorization: `Bearer ${this.adminApiKey}`,
          'X-Bot-Client': 'zurichjs-mcp/1.0',
        },
        signal: AbortSignal.timeout(10_000),
      },
      { attempts: 3, label: `ZurichJS MCP ${path}` },
    );

    if (!response.ok) {
      throw new Error(`Admin API ${path} returned ${response.status}`);
    }

    return response.json() as Promise<unknown>;
  }
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('ZURICHJS_INTERNAL_API_BASE_URL must use HTTP or HTTPS');
  }
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.toString();
}

function countBy<T>(items: T[], getKey: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function sumMoneyByCurrency(
  tickets: Array<{ amount_paid: number; currency: string | null }>,
): Record<string, number> {
  return tickets.reduce<Record<string, number>>((totals, ticket) => {
    const currency = ticket.currency?.toUpperCase() || 'CHF';
    totals[currency] = (totals[currency] ?? 0) + ticket.amount_paid;
    return totals;
  }, {});
}
