/**
 * Admin networking directory.
 *
 * Pure assembly of "who has set up networking" across the three places the
 * settings live: attendee tickets, sponsors, and manually added badge rows.
 * Loading from Supabase is kept in `loadNetworkingDirectory` so the shaping
 * can be unit tested without a database.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { attendeeLinks, sponsorLinks } from '@/lib/networking/profiles';
import type {
  NetworkingDirectoryEntry,
  NetworkingDirectoryResponse,
  NetworkingDirectorySource,
  NetworkingDirectoryStats,
  NetworkingProfileKind,
  PublicNetworkingLink,
} from '@/lib/types/networking';
import {
  attendeeNetworkingProfileSchema,
  sponsorNetworkingProfileSchema,
} from '@/lib/validations/networking';

export interface NetworkingProfileRow {
  id: string;
  subject_type: string;
  ticket_id: string | null;
  sponsor_id: string | null;
  share_id: string;
  enabled: boolean;
  profile: unknown;
  updated_at: string;
}

export interface DirectoryTicketRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  job_title: string | null;
  ticket_category: string;
  status: string;
}

export interface DirectorySponsorRow {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
}

export interface DirectoryManualRow {
  id: string;
  category: string;
  first_name: string;
  last_name: string;
  role: string;
  company: string;
  share_id: string;
  networking_enabled: boolean;
  networking_profile: unknown;
  updated_at: string;
}

export interface NetworkingDirectoryInputs {
  profiles: NetworkingProfileRow[];
  tickets: DirectoryTicketRow[];
  sponsors: DirectorySponsorRow[];
  manualRows: DirectoryManualRow[];
}

const MANUAL_KINDS: ReadonlySet<string> = new Set(['vip', 'attendee', 'speaker', 'sponsor', 'organizer']);

function headline(role: string | null, company: string | null): string | null {
  const cleanRole = role?.trim() || null;
  const cleanCompany = company?.trim() || null;
  if (cleanRole && cleanCompany) return `${cleanRole} @ ${cleanCompany}`;
  return cleanRole ?? cleanCompany;
}

function hasAnyValue(profile: unknown): boolean {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return false;
  return Object.values(profile as Record<string, unknown>).some(
    (value) => typeof value === 'string' && value.trim().length > 0
  );
}

function safeAttendeeLinks(profile: unknown): PublicNetworkingLink[] {
  const parsed = attendeeNetworkingProfileSchema.safeParse(profile);
  return parsed.success ? attendeeLinks(parsed.data) : [];
}

function safeSponsorLinks(profile: unknown): PublicNetworkingLink[] {
  const parsed = sponsorNetworkingProfileSchema.safeParse(profile);
  return parsed.success ? sponsorLinks(parsed.data) : [];
}

function sponsorContactName(profile: unknown): string | null {
  const parsed = sponsorNetworkingProfileSchema.safeParse(profile);
  return parsed.success ? parsed.data.contactName : null;
}

function emptyStats(): NetworkingDirectoryStats {
  return {
    total: 0,
    enabled: 0,
    bySource: {
      attendee: { total: 0, enabled: 0 },
      sponsor: { total: 0, enabled: 0 },
      manual: { total: 0, enabled: 0 },
    },
  };
}

function summarize(entries: NetworkingDirectoryEntry[]): NetworkingDirectoryStats {
  const stats = emptyStats();
  for (const entry of entries) {
    stats.total += 1;
    stats.bySource[entry.source].total += 1;
    if (entry.enabled) {
      stats.enabled += 1;
      stats.bySource[entry.source].enabled += 1;
    }
  }
  return stats;
}

function compareEntries(left: NetworkingDirectoryEntry, right: NetworkingDirectoryEntry): number {
  if (left.enabled !== right.enabled) return left.enabled ? -1 : 1;
  return left.name.localeCompare(right.name, 'en', { sensitivity: 'base' });
}

/**
 * Shape raw rows into directory entries. Attendee rows whose ticket is no
 * longer confirmed are dropped (the public page would 404 for them anyway),
 * as are rows whose subject record is missing.
 */
export function buildNetworkingDirectory(
  inputs: NetworkingDirectoryInputs,
  baseUrl: string
): Omit<NetworkingDirectoryResponse, 'generated_at'> {
  const ticketsById = new Map(inputs.tickets.map((ticket) => [ticket.id, ticket]));
  const sponsorsById = new Map(inputs.sponsors.map((sponsor) => [sponsor.id, sponsor]));
  const shareUrl = (publicId: string): string => `${baseUrl.replace(/\/$/, '')}/share/${publicId}`;

  const entries: NetworkingDirectoryEntry[] = [];

  for (const row of inputs.profiles) {
    if (row.subject_type === 'attendee' && row.ticket_id) {
      const ticket = ticketsById.get(row.ticket_id);
      if (!ticket || ticket.status !== 'confirmed') continue;
      const publicId = `attendee-${row.share_id}`;
      entries.push({
        id: row.id,
        source: 'attendee',
        kind: ticket.ticket_category === 'vip' ? 'vip' : 'attendee',
        name: `${ticket.first_name} ${ticket.last_name}`.trim(),
        headline: headline(ticket.job_title, ticket.company),
        contactEmail: ticket.email,
        enabled: row.enabled,
        links: safeAttendeeLinks(row.profile),
        publicId,
        shareUrl: shareUrl(publicId),
        updatedAt: row.updated_at,
      });
      continue;
    }

    if (row.subject_type === 'sponsor' && row.sponsor_id) {
      const sponsor = sponsorsById.get(row.sponsor_id);
      if (!sponsor) continue;
      const publicId = `sponsor-${row.share_id}`;
      entries.push({
        id: row.id,
        source: 'sponsor',
        kind: 'sponsor',
        name: sponsor.company_name,
        headline: sponsorContactName(row.profile) ?? sponsor.contact_name,
        contactEmail: sponsor.contact_email,
        enabled: row.enabled,
        links: safeSponsorLinks(row.profile),
        publicId,
        shareUrl: shareUrl(publicId),
        updatedAt: row.updated_at,
      });
    }
  }

  for (const row of inputs.manualRows) {
    // Manual rows exist for badge printing; only list the ones that touched networking.
    if (!row.networking_enabled && !hasAnyValue(row.networking_profile)) continue;
    const publicId = `badge-${row.share_id}`;
    const kind: NetworkingProfileKind = MANUAL_KINDS.has(row.category)
      ? (row.category as NetworkingProfileKind)
      : 'attendee';
    entries.push({
      id: row.id,
      source: 'manual',
      kind,
      name: `${row.first_name} ${row.last_name}`.trim(),
      headline: headline(row.role, row.company),
      contactEmail: null,
      enabled: row.networking_enabled,
      links: safeAttendeeLinks(row.networking_profile),
      publicId,
      shareUrl: shareUrl(publicId),
      updatedAt: row.updated_at,
    });
  }

  entries.sort(compareEntries);
  return { entries, stats: summarize(entries) };
}

const PAGE_SIZE = 500;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

async function fetchAll<T>(
  queryPage: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await queryPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

function chunks<T>(values: T[], size = 200): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function fetchByIds<T>(
  ids: string[],
  queryChunk: (chunk: string[]) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const rows: T[] = [];
  for (const chunk of chunks(ids)) {
    const { data, error } = await queryChunk(chunk);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
  }
  return rows;
}

/** Load every networking-related row and shape it for the admin directory. */
export async function loadNetworkingDirectory(
  client: SupabaseClient,
  baseUrl: string
): Promise<NetworkingDirectoryResponse> {
  const [profiles, manualRows] = await Promise.all([
    fetchAll<NetworkingProfileRow>((from, to) => client
      .from('networking_profiles')
      .select('id, subject_type, ticket_id, sponsor_id, share_id, enabled, profile, updated_at')
      .order('updated_at', { ascending: false })
      .range(from, to) as unknown as PromiseLike<PageResult<NetworkingProfileRow>>),
    fetchAll<DirectoryManualRow>((from, to) => client
      .from('manual_badge_entries')
      .select('id, category, first_name, last_name, role, company, share_id, networking_enabled, networking_profile, updated_at')
      .order('updated_at', { ascending: false })
      .range(from, to) as unknown as PromiseLike<PageResult<DirectoryManualRow>>),
  ]);

  const ticketIds = profiles.flatMap((row) => (row.ticket_id ? [row.ticket_id] : []));
  const sponsorIds = profiles.flatMap((row) => (row.sponsor_id ? [row.sponsor_id] : []));

  const [tickets, sponsors] = await Promise.all([
    fetchByIds<DirectoryTicketRow>(ticketIds, (chunk) => client
      .from('tickets')
      .select('id, first_name, last_name, email, company, job_title, ticket_category, status')
      .in('id', chunk) as unknown as PromiseLike<PageResult<DirectoryTicketRow>>),
    fetchByIds<DirectorySponsorRow>(sponsorIds, (chunk) => client
      .from('sponsors')
      .select('id, company_name, contact_name, contact_email')
      .in('id', chunk) as unknown as PromiseLike<PageResult<DirectorySponsorRow>>),
  ]);

  return {
    ...buildNetworkingDirectory({ profiles, tickets, sponsors, manualRows }, baseUrl),
    generated_at: new Date().toISOString(),
  };
}

export const NETWORKING_DIRECTORY_SOURCES: readonly NetworkingDirectorySource[] = ['attendee', 'sponsor', 'manual'] as const;
