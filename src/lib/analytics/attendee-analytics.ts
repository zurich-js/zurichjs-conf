/**
 * Attendee Analytics
 * Compute aggregate analytics for the attendee admin dashboard
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type {
  AttendeeAnalytics,
  AttendeeSummary,
  AttendeeDemographics,
  AttendeeAcquisition,
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
  coupon_code: string | null;
  partnership_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export async function getAttendeeAnalytics(): Promise<AttendeeAnalytics> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('tickets')
    .select('id, first_name, last_name, email, company, job_title, ticket_category, ticket_stage, amount_paid, currency, status, checked_in, coupon_code, partnership_id, created_at, metadata')
    .order('created_at', { ascending: true });

  if (error) throw error;

  const tickets = (data || []) as TicketRow[];
  const confirmed = tickets.filter((t) => t.status === 'confirmed');

  const summary = buildSummary(tickets, confirmed);
  const byCategory = buildGroupCount(confirmed, (t) => t.ticket_category);
  const byStage = buildGroupCount(confirmed, (t) => t.ticket_stage);
  const demographics = buildDemographics(confirmed);
  const acquisition = buildAcquisition(confirmed);

  return { summary, byCategory, byStage, demographics, acquisition };
}

function buildSummary(allTickets: TicketRow[], confirmed: TicketRow[]): AttendeeSummary {
  const totalRevenue = confirmed.reduce((sum, t) => sum + t.amount_paid, 0);
  const companies = new Set(confirmed.map((t) => normalizeCompany(t)).filter(Boolean));
  const countries = new Set(confirmed.map((t) => extractCountry(t)).filter(Boolean));

  return {
    totalAttendees: allTickets.filter((t) => t.status !== 'cancelled' && t.status !== 'refunded').length,
    confirmedAttendees: confirmed.length,
    checkedIn: confirmed.filter((t) => t.checked_in).length,
    avgTicketPrice: confirmed.length > 0 ? totalRevenue / confirmed.length : 0,
    companiesRepresented: companies.size,
    countriesRepresented: countries.size,
  };
}

function buildGroupCount(
  tickets: TicketRow[],
  keyFn: (t: TicketRow) => string
): Record<string, { count: number }> {
  const result: Record<string, { count: number }> = {};
  for (const t of tickets) {
    const key = keyFn(t) || 'unknown';
    if (!result[key]) result[key] = { count: 0 };
    result[key].count++;
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

function buildAcquisition(tickets: TicketRow[]): AttendeeAcquisition {
  let individual = 0;
  let b2b = 0;
  let complimentary = 0;
  let withCoupon = 0;
  let fromPartnerships = 0;
  const couponCounts = new Map<string, number>();
  const partnershipCounts = new Map<string, number>();

  for (const t of tickets) {
    const meta = t.metadata as { paymentType?: string } | null;
    if (meta?.paymentType === 'complimentary') {
      complimentary++;
    } else if (t.partnership_id && meta?.paymentType === 'bank_transfer') {
      b2b++;
    } else {
      individual++;
    }

    if (t.coupon_code) {
      withCoupon++;
      const code = t.coupon_code.toUpperCase().trim();
      couponCounts.set(code, (couponCounts.get(code) || 0) + 1);
    }

    if (t.partnership_id) {
      fromPartnerships++;
      partnershipCounts.set(t.partnership_id, (partnershipCounts.get(t.partnership_id) || 0) + 1);
    }
  }

  // Velocity
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let thisWeek = 0;
  let thisMonth = 0;

  for (const t of tickets) {
    const created = new Date(t.created_at);
    if (created >= startOfWeek) thisWeek++;
    if (created >= startOfMonth) thisMonth++;
  }

  // Average per week since first ticket
  const firstDate = tickets.length > 0 ? new Date(tickets[0].created_at) : now;
  const weeksSinceFirst = Math.max(1, (now.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const avgPerWeek = Math.round((tickets.length / weeksSinceFirst) * 10) / 10;

  return {
    byChannel: { individual, b2b, complimentary },
    withCoupon,
    fromPartnerships,
    topCoupons: topN(couponCounts, 10).map(([code, count]) => ({ code, count })),
    topPartnerships: topN(partnershipCounts, 10).map(([partnershipId, count]) => ({ partnershipId, count })),
    velocity: { thisWeek, thisMonth, avgPerWeek },
  };
}

function normalizeCompany(t: TicketRow): string | null {
  const company = t.company
    || (t.metadata as { session_metadata?: { company?: string } })?.session_metadata?.company
    || null;
  return company?.trim() || null;
}

function normalizeJobTitle(t: TicketRow): string | null {
  const jobTitle = t.job_title
    || (t.metadata as { session_metadata?: { jobTitle?: string } })?.session_metadata?.jobTitle
    || null;
  return jobTitle?.trim() || null;
}

function extractCountry(t: TicketRow): string | null {
  const country = (t.metadata as { session_metadata?: { country?: string } })?.session_metadata?.country;
  return country?.trim() || null;
}

function extractCity(t: TicketRow): string | null {
  const city = (t.metadata as { session_metadata?: { city?: string } })?.session_metadata?.city;
  if (!city?.trim()) return null;
  return normalizeCityName(city.trim());
}

/** Normalize city names so variants like Zürich/Zurich are merged */
const CITY_ALIASES: Record<string, string> = {
  'zurich': 'Zürich',
  'zürich': 'Zürich',
  'zuerich': 'Zürich',
  'geneva': 'Geneva',
  'geneve': 'Geneva',
  'genève': 'Geneva',
  'bern': 'Bern',
  'berne': 'Bern',
  'basel': 'Basel',
  'basle': 'Basel',
  'bâle': 'Basel',
  'lucerne': 'Lucerne',
  'luzern': 'Lucerne',
  'munich': 'Munich',
  'münchen': 'Munich',
  'muenchen': 'Munich',
  'cologne': 'Cologne',
  'köln': 'Cologne',
  'koeln': 'Cologne',
  'vienna': 'Vienna',
  'wien': 'Vienna',
};

function normalizeCityName(city: string): string {
  return CITY_ALIASES[city.toLowerCase()] || city;
}

function topN(map: Map<string, number>, n: number): Array<[string, number]> {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}
