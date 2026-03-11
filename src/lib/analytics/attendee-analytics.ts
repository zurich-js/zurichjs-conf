/**
 * Attendee Analytics
 * Compute aggregate analytics for the attendee admin dashboard
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type {
  AttendeeAnalytics,
  AttendeeSummary,
  AttendeeDemographics,
  AttendeeTimelineEntry,
} from '@/lib/types/attendee-analytics';

interface TicketRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  job_title: string | null;
  ticket_category: string;
  ticket_stage: string;
  amount_paid: number;
  currency: string;
  status: string;
  checked_in: boolean | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export async function getAttendeeAnalytics(): Promise<AttendeeAnalytics> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('tickets')
    .select('id, first_name, last_name, email, company, job_title, ticket_category, ticket_stage, amount_paid, currency, status, checked_in, created_at, metadata')
    .order('created_at', { ascending: true });

  if (error) throw error;

  const tickets = (data || []) as TicketRow[];
  const confirmed = tickets.filter((t) => t.status === 'confirmed');

  const summary = buildSummary(tickets, confirmed);
  const byCategory = buildGroupBreakdown(confirmed, (t) => t.ticket_category);
  const byStage = buildGroupBreakdown(confirmed, (t) => t.ticket_stage);
  const demographics = buildDemographics(confirmed);
  const registrationTimeline = buildTimeline(confirmed);

  return { summary, byCategory, byStage, demographics, registrationTimeline };
}

function buildSummary(allTickets: TicketRow[], confirmed: TicketRow[]): AttendeeSummary {
  const totalRevenue = confirmed.reduce((sum, t) => sum + t.amount_paid, 0);
  const companies = new Set(confirmed.map((t) => normalizeCompany(t)).filter(Boolean));
  const countries = new Set(confirmed.map((t) => extractCountry(t)).filter(Boolean));

  return {
    totalAttendees: allTickets.filter((t) => t.status !== 'cancelled' && t.status !== 'refunded').length,
    confirmedAttendees: confirmed.length,
    checkedIn: confirmed.filter((t) => t.checked_in).length,
    totalRevenue,
    avgTicketPrice: confirmed.length > 0 ? totalRevenue / confirmed.length : 0,
    companiesRepresented: companies.size,
    countriesRepresented: countries.size,
  };
}

function buildGroupBreakdown(
  tickets: TicketRow[],
  keyFn: (t: TicketRow) => string
): Record<string, { count: number; revenue: number }> {
  const result: Record<string, { count: number; revenue: number }> = {};
  for (const t of tickets) {
    const key = keyFn(t) || 'unknown';
    if (!result[key]) result[key] = { count: 0, revenue: 0 };
    result[key].count++;
    result[key].revenue += t.amount_paid;
  }
  return result;
}

function buildDemographics(tickets: TicketRow[]): AttendeeDemographics {
  const companyCounts = new Map<string, number>();
  const jobTitleCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  const cityCounts = new Map<string, number>();

  let companyProvided = 0;
  let jobTitleProvided = 0;

  for (const t of tickets) {
    const company = normalizeCompany(t);
    if (company) {
      companyCounts.set(company, (companyCounts.get(company) || 0) + 1);
      companyProvided++;
    }

    const jobTitle = normalizeJobTitle(t);
    if (jobTitle) {
      jobTitleCounts.set(jobTitle, (jobTitleCounts.get(jobTitle) || 0) + 1);
      jobTitleProvided++;
    }

    const country = extractCountry(t);
    if (country) {
      countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
    }

    const city = extractCity(t);
    if (city) {
      cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
    }
  }

  return {
    topCompanies: topN(companyCounts, 15).map(([company, count]) => ({ company, count })),
    topJobTitles: topN(jobTitleCounts, 15).map(([jobTitle, count]) => ({ jobTitle, count })),
    topCountries: topN(countryCounts, 15).map(([country, count]) => ({ country, count })),
    topCities: topN(cityCounts, 10).map(([city, count]) => ({ city, count })),
    companyProvided,
    companyMissing: tickets.length - companyProvided,
    jobTitleProvided,
    jobTitleMissing: tickets.length - jobTitleProvided,
  };
}

function buildTimeline(tickets: TicketRow[]): AttendeeTimelineEntry[] {
  if (tickets.length === 0) return [];

  const dayCounts = new Map<string, { count: number; revenue: number }>();
  for (const t of tickets) {
    const day = t.created_at.split('T')[0];
    const existing = dayCounts.get(day) || { count: 0, revenue: 0 };
    existing.count++;
    existing.revenue += t.amount_paid;
    dayCounts.set(day, existing);
  }

  const sorted = [...dayCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let cumulative = 0;
  let cumulativeRevenue = 0;
  return sorted.map(([date, { count, revenue }]) => {
    cumulative += count;
    cumulativeRevenue += revenue;
    return { date, count, cumulative, revenue, cumulativeRevenue };
  });
}

/** Extract company from ticket fields or session metadata */
function normalizeCompany(t: TicketRow): string | null {
  const company = t.company
    || (t.metadata as { session_metadata?: { company?: string } })?.session_metadata?.company
    || null;
  return company?.trim() || null;
}

/** Extract job title from ticket fields or session metadata */
function normalizeJobTitle(t: TicketRow): string | null {
  const jobTitle = t.job_title
    || (t.metadata as { session_metadata?: { jobTitle?: string } })?.session_metadata?.jobTitle
    || null;
  return jobTitle?.trim() || null;
}

/** Extract country from session metadata */
function extractCountry(t: TicketRow): string | null {
  const country = (t.metadata as { session_metadata?: { country?: string } })?.session_metadata?.country;
  return country?.trim() || null;
}

/** Extract city from session metadata */
function extractCity(t: TicketRow): string | null {
  const city = (t.metadata as { session_metadata?: { city?: string } })?.session_metadata?.city;
  return city?.trim() || null;
}

function topN(map: Map<string, number>, n: number): Array<[string, number]> {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}
