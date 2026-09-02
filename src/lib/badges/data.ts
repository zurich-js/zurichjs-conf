import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AttendeeNetworkingProfile } from '@/lib/types/networking';
import { attendeeNetworkingProfileSchema } from '@/lib/validations/networking';
import type {
  AttendeeBadgeSource,
  BadgeCategory,
  BadgeExportSources,
  ManualBadgeSource,
  SpeakerBadgeSource,
} from '@/lib/badges/export';

interface NetworkingRow {
  ticket_id: string | null;
  share_id: string;
  enabled: boolean;
}

interface BadgeCodeRow {
  subject_key: string;
  target_public_id: string;
  code: string;
}

type AttendeeRow = Omit<AttendeeBadgeSource, 'share_id' | 'badge_code'>;
type PublicSpeakerRow = Omit<SpeakerBadgeSource, 'badge_code'>;
type ManualRow = Omit<ManualBadgeSource, 'category' | 'badge_code'> & {
  category: string;
  networking_enabled: boolean;
  networking_profile: unknown;
};

interface BaseRows {
  tickets: AttendeeRow[];
  manualRows: ManualRow[];
  networkingRows: NetworkingRow[];
  badgeCodes: BadgeCodeRow[];
}

function restrictBaseRows(
  rows: BaseRows,
  includedSelectionIds: string[] | undefined
): BaseRows {
  if (!includedSelectionIds) return rows;
  const included = new Set(includedSelectionIds);
  return {
    ...rows,
    tickets: rows.tickets.filter((row) => included.has(`attendee:${row.id}`)),
    manualRows: rows.manualRows.filter((row) => included.has(`manual:${row.id}`)),
  };
}

export interface BadgeReviewRow {
  selectionId: string;
  source: 'attendee' | 'speaker' | 'sponsor' | 'manual';
  category: BadgeCategory;
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  company: string;
  logoUrl: string | null;
  publicId: string | null;
  shareUrl: string | null;
  badgeCode: string | null;
  qrUrl: string | null;
  networkingEnabled: boolean;
  networkingProfile: AttendeeNetworkingProfile | null;
}

const PAGE_SIZE = 500;

async function fetchAll<T>(
  queryPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await queryPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

async function loadBaseRows(client: SupabaseClient): Promise<BaseRows> {
  const [tickets, manualRows, networkingRows, badgeCodes] = await Promise.all([
    fetchAll<AttendeeRow>((from, to) => client
      .from('tickets')
      .select('id, first_name, last_name, company, job_title, ticket_category')
      .eq('status', 'confirmed')
      .order('first_name', { ascending: true })
      .order('last_name', { ascending: true })
      .range(from, to) as unknown as PromiseLike<{
        data: AttendeeRow[] | null;
        error: { message: string } | null;
      }>),
    fetchAll<ManualRow>((from, to) => client
      .from('manual_badge_entries')
      .select('id, category, first_name, last_name, role, company, logo_url, share_id, networking_enabled, networking_profile')
      .order('category', { ascending: true })
      .order('first_name', { ascending: true })
      .order('last_name', { ascending: true })
      .range(from, to) as unknown as PromiseLike<{
        data: ManualRow[] | null;
        error: { message: string } | null;
      }>),
    fetchAll<NetworkingRow>((from, to) => client
      .from('networking_profiles')
      .select('ticket_id, share_id, enabled')
      .range(from, to) as unknown as PromiseLike<{
        data: NetworkingRow[] | null;
        error: { message: string } | null;
      }>),
    fetchAll<BadgeCodeRow>((from, to) => client
      .from('badge_qr_codes')
      .select('subject_key, target_public_id, code')
      .range(from, to) as unknown as PromiseLike<{
        data: BadgeCodeRow[] | null;
        error: { message: string } | null;
      }>),
  ]);

  return { tickets, manualRows, networkingRows, badgeCodes };
}

function chunks<T>(values: T[]): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += PAGE_SIZE) {
    result.push(values.slice(index, index + PAGE_SIZE));
  }
  return result;
}

async function provisionMissingShareRows(
  client: SupabaseClient,
  ticketIds: string[]
): Promise<void> {
  for (const ids of chunks(ticketIds)) {
    const { error } = await client.from('networking_profiles').upsert(
      ids.map((ticketId) => ({ subject_type: 'attendee', ticket_id: ticketId, enabled: false })),
      { onConflict: 'ticket_id', ignoreDuplicates: true }
    );
    if (error) throw new Error(`Failed to provision attendee share IDs: ${error.message}`);
  }
}

async function provisionBadgeCodes(
  client: SupabaseClient,
  targets: Array<{ subject_key: string; target_public_id: string; code?: string }>
): Promise<void> {
  for (const rows of chunks(targets)) {
    const { error } = await client.from('badge_qr_codes').upsert(
      assignMissingBadgeCodes(rows),
      {
        onConflict: 'subject_key',
      }
    );
    if (error) throw new Error(`Failed to provision badge QR codes: ${error.message}`);
  }
}

export function assignMissingBadgeCodes(
  targets: Array<{ subject_key: string; target_public_id: string; code?: string }>,
  createCode: () => string = randomUUID
): Array<{ subject_key: string; target_public_id: string; code: string }> {
  return targets.map((target) => ({
    ...target,
    code: target.code ?? createCode(),
  }));
}

export function assignRegeneratedBadgeCodes(
  targets: BadgeCodeRow[],
  createCode: () => string = randomUUID
): BadgeCodeRow[] {
  return targets.map((target) => ({
    ...target,
    code: createCode(),
  }));
}

export async function regenerateAllBadgeCodes(client: SupabaseClient): Promise<number> {
  const existingCodes = await fetchAll<BadgeCodeRow>((from, to) => client
    .from('badge_qr_codes')
    .select('subject_key, target_public_id, code')
    .order('subject_key', { ascending: true })
    .range(from, to) as unknown as PromiseLike<{
      data: BadgeCodeRow[] | null;
      error: { message: string } | null;
    }>);

  for (const rows of chunks(existingCodes)) {
    const { error } = await client.from('badge_qr_codes').upsert(
      assignRegeneratedBadgeCodes(rows),
      { onConflict: 'subject_key' }
    );
    if (error) throw new Error(`Failed to regenerate badge QR codes: ${error.message}`);
  }

  return existingCodes.length;
}

function publicUrl(baseUrl: string, pathname: string): string {
  return new URL(pathname, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

function subjectTargets(
  rows: BaseRows,
  speakers: PublicSpeakerRow[]
): Array<{ subject_key: string; target_public_id: string }> {
  const ticketShares = new Map(
    rows.networkingRows.filter((row) => row.ticket_id).map((row) => [row.ticket_id!, row.share_id])
  );
  return [
    ...rows.tickets.flatMap((ticket) => {
      const shareId = ticketShares.get(ticket.id);
      return shareId ? [{
        subject_key: `attendee:${ticket.id}`,
        target_public_id: `attendee-${shareId}`,
      }] : [];
    }),
    ...speakers.map((speaker) => ({
      subject_key: `speaker:${speaker.id}`,
      target_public_id: `speaker-${speaker.slug}`,
    })),
    ...rows.manualRows.map((entry) => ({
      subject_key: `manual:${entry.id}`,
      target_public_id: `badge-${entry.share_id}`,
    })),
  ];
}

export async function loadBadgeSources(
  client: SupabaseClient,
  publicSpeakers: PublicSpeakerRow[],
  provisionMissing: boolean,
  includedSelectionIds?: string[]
): Promise<BadgeExportSources> {
  const selectedSpeakers = includedSelectionIds
    ? publicSpeakers.filter((speaker) => includedSelectionIds.includes(`speaker:${speaker.id}`))
    : publicSpeakers;
  let rows = restrictBaseRows(await loadBaseRows(client), includedSelectionIds);
  let ticketShares = new Map(
    rows.networkingRows.filter((row) => row.ticket_id).map((row) => [row.ticket_id!, row.share_id])
  );
  const missingTicketIds = rows.tickets.filter((ticket) => !ticketShares.has(ticket.id)).map((ticket) => ticket.id);

  if (missingTicketIds.length) {
    if (!provisionMissing) {
      throw new Error(
        `${missingTicketIds.length} attendee(s) need share IDs. ` +
        'Run “Generate missing codes” before exporting.'
      );
    }
    await provisionMissingShareRows(client, missingTicketIds);
    rows = restrictBaseRows(await loadBaseRows(client), includedSelectionIds);
    ticketShares = new Map(
      rows.networkingRows.filter((row) => row.ticket_id).map((row) => [row.ticket_id!, row.share_id])
    );
  }

  const targets = subjectTargets(rows, selectedSpeakers);
  const codesBySubject = new Map(rows.badgeCodes.map((row) => [row.subject_key, row]));
  const missingOrStaleCodes = targets.flatMap((target) => {
    const code = codesBySubject.get(target.subject_key);
    if (!code) return [target];
    if (code.target_public_id !== target.target_public_id) {
      return [{ ...target, code: code.code }];
    }
    return [];
  });

  if (missingOrStaleCodes.length) {
    if (!provisionMissing) {
      throw new Error(
        `${missingOrStaleCodes.length} badge QR code(s) need provisioning. ` +
        'Run “Generate missing codes” before exporting.'
      );
    }
    await provisionBadgeCodes(client, missingOrStaleCodes);
    rows = restrictBaseRows(await loadBaseRows(client), includedSelectionIds);
  }

  const finalCodes = new Map(rows.badgeCodes.map((row) => [row.subject_key, row.code]));
  const attendees = rows.tickets.map((ticket): AttendeeBadgeSource => {
    const shareId = ticketShares.get(ticket.id);
    const badgeCode = finalCodes.get(`attendee:${ticket.id}`);
    if (!shareId || !badgeCode) throw new Error(`Attendee ${ticket.id} is missing badge identifiers`);
    return { ...ticket, share_id: shareId, badge_code: badgeCode };
  });
  const speakers = selectedSpeakers.map((speaker): SpeakerBadgeSource => {
    const badgeCode = finalCodes.get(`speaker:${speaker.id}`);
    if (!badgeCode) throw new Error(`Speaker ${speaker.id} is missing a badge QR code`);
    return { ...speaker, badge_code: badgeCode };
  });
  const manual = rows.manualRows.map((entry): ManualBadgeSource => {
    const badgeCode = finalCodes.get(`manual:${entry.id}`);
    if (!badgeCode) throw new Error(`Manual badge ${entry.id} is missing a badge QR code`);
    return {
      id: entry.id,
      category: entry.category as BadgeCategory,
      first_name: entry.first_name,
      last_name: entry.last_name,
      role: entry.role,
      company: entry.company,
      logo_url: entry.logo_url,
      share_id: entry.share_id,
      badge_code: badgeCode,
    };
  });

  return { attendees, speakers, sponsors: [], manual };
}

export async function loadBadgeReviewRows(
  client: SupabaseClient,
  publicSpeakers: PublicSpeakerRow[],
  baseUrl: string
): Promise<BadgeReviewRow[]> {
  const rows = await loadBaseRows(client);
  const ticketNetworking = new Map(
    rows.networkingRows.filter((row) => row.ticket_id).map((row) => [row.ticket_id!, row])
  );
  const codes = new Map(rows.badgeCodes.map((row) => [row.subject_key, row]));

  const reviewRow = (
    value: Omit<BadgeReviewRow, 'shareUrl' | 'badgeCode' | 'qrUrl'>,
    subjectKey: string
  ): BadgeReviewRow => {
    const badgeCode = value.publicId ? codes.get(subjectKey)?.code ?? null : null;
    return {
      ...value,
      shareUrl: value.publicId ? publicUrl(baseUrl, `/share/${value.publicId}`) : null,
      badgeCode,
      qrUrl: badgeCode ? publicUrl(baseUrl, `/b/${badgeCode}`) : null,
    };
  };

  return [
    ...rows.tickets.map((ticket) => {
      const networking = ticketNetworking.get(ticket.id);
      return reviewRow({
        selectionId: `attendee:${ticket.id}`,
        source: 'attendee',
        category: ticket.ticket_category === 'vip' ? 'vip' : 'attendee',
        id: ticket.id,
        firstName: ticket.first_name,
        lastName: ticket.last_name,
        role: ticket.job_title ?? '',
        company: ticket.company ?? '',
        logoUrl: null,
        publicId: networking ? `attendee-${networking.share_id}` : null,
        networkingEnabled: networking?.enabled ?? false,
        networkingProfile: null,
      }, `attendee:${ticket.id}`);
    }),
    ...publicSpeakers.map((speaker) => reviewRow({
      selectionId: `speaker:${speaker.id}`,
      source: 'speaker',
      category: 'speaker',
      id: speaker.id,
      firstName: speaker.first_name,
      lastName: speaker.last_name,
      role: speaker.job_title ?? '',
      company: speaker.company ?? '',
      logoUrl: null,
      publicId: `speaker-${speaker.slug}`,
      networkingEnabled: true,
      networkingProfile: null,
    }, `speaker:${speaker.id}`)),
    ...rows.manualRows.map((entry) => {
      const profile = attendeeNetworkingProfileSchema.safeParse(entry.networking_profile);
      return reviewRow({
        selectionId: `manual:${entry.id}`,
        source: 'manual',
        category: entry.category as BadgeCategory,
        id: entry.id,
        firstName: entry.first_name,
        lastName: entry.last_name,
        role: entry.role,
        company: entry.company,
        logoUrl: entry.logo_url,
        publicId: `badge-${entry.share_id}`,
        networkingEnabled: entry.networking_enabled,
        networkingProfile: profile.success ? profile.data : null,
      }, `manual:${entry.id}`);
    }),
  ];
}

export function filterBadgeSources(
  sources: BadgeExportSources,
  includedSelectionIds: string[] | undefined
): BadgeExportSources {
  if (!includedSelectionIds) return sources;
  const included = new Set(includedSelectionIds);
  return {
    attendees: sources.attendees.filter((row) => included.has(`attendee:${row.id}`)),
    speakers: sources.speakers.filter((row) => included.has(`speaker:${row.id}`)),
    sponsors: sources.sponsors.filter((row) => included.has(`sponsor:${row.id}`)),
    manual: sources.manual.filter((row) => included.has(`manual:${row.id}`)),
  };
}
