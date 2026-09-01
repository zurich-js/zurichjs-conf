import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AttendeeBadgeSource,
  BadgeExportSources,
  SpeakerBadgeSource,
  SponsorBadgeSource,
} from '@/lib/badges/export';

interface NetworkingRow {
  ticket_id: string | null;
  sponsor_id: string | null;
  share_id: string;
}

type AttendeeRow = Omit<AttendeeBadgeSource, 'share_id'>;
type SponsorRow = Omit<SponsorBadgeSource, 'share_id'>;

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

async function loadNetworkingRows(client: SupabaseClient): Promise<NetworkingRow[]> {
  return fetchAll((from, to) => client
    .from('networking_profiles')
    .select('ticket_id, sponsor_id, share_id')
    .range(from, to) as unknown as PromiseLike<{
      data: NetworkingRow[] | null;
      error: { message: string } | null;
    }>);
}

async function provisionMissingRows(
  client: SupabaseClient,
  ticketIds: string[],
  sponsorIds: string[]
): Promise<void> {
  const chunks = <T>(values: T[]): T[][] => {
    const result: T[][] = [];
    for (let index = 0; index < values.length; index += PAGE_SIZE) {
      result.push(values.slice(index, index + PAGE_SIZE));
    }
    return result;
  };

  for (const ids of chunks(ticketIds)) {
    const { error } = await client.from('networking_profiles').upsert(
      ids.map((ticketId) => ({ subject_type: 'attendee', ticket_id: ticketId, enabled: false })),
      { onConflict: 'ticket_id', ignoreDuplicates: true }
    );
    if (error) throw new Error(`Failed to provision attendee share IDs: ${error.message}`);
  }
  for (const ids of chunks(sponsorIds)) {
    const { error } = await client.from('networking_profiles').upsert(
      ids.map((sponsorId) => ({ subject_type: 'sponsor', sponsor_id: sponsorId, enabled: false })),
      { onConflict: 'sponsor_id', ignoreDuplicates: true }
    );
    if (error) throw new Error(`Failed to provision sponsor share IDs: ${error.message}`);
  }
}

export async function loadBadgeSources(
  client: SupabaseClient,
  publicSpeakers: SpeakerBadgeSource[],
  provisionShareIds: boolean
): Promise<BadgeExportSources> {
  const [tickets, sponsors] = await Promise.all([
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
    fetchAll<SponsorRow>((from, to) => client
      .from('sponsors')
      .select('id, company_name, contact_name, logo_url, logo_url_color')
      .order('company_name', { ascending: true })
      .range(from, to) as unknown as PromiseLike<{
        data: SponsorRow[] | null;
        error: { message: string } | null;
      }>),
  ]);

  let networkingRows = await loadNetworkingRows(client);
  const ticketShares = new Map(
    networkingRows.filter((row) => row.ticket_id).map((row) => [row.ticket_id!, row.share_id])
  );
  const sponsorShares = new Map(
    networkingRows.filter((row) => row.sponsor_id).map((row) => [row.sponsor_id!, row.share_id])
  );
  const missingTicketIds = tickets
    .filter((ticket) => !ticketShares.has(ticket.id))
    .map((ticket) => ticket.id);
  const missingSponsorIds = sponsors
    .filter((sponsor) => !sponsorShares.has(sponsor.id))
    .map((sponsor) => sponsor.id);

  if (missingTicketIds.length || missingSponsorIds.length) {
    if (!provisionShareIds) {
      throw new Error(
        `${missingTicketIds.length} attendee(s) and ${missingSponsorIds.length} sponsor(s) need share IDs. ` +
        'Allow disabled share-ID provisioning and try again.'
      );
    }
    await provisionMissingRows(client, missingTicketIds, missingSponsorIds);
    networkingRows = await loadNetworkingRows(client);
    ticketShares.clear();
    sponsorShares.clear();
    for (const row of networkingRows) {
      if (row.ticket_id) ticketShares.set(row.ticket_id, row.share_id);
      if (row.sponsor_id) sponsorShares.set(row.sponsor_id, row.share_id);
    }
  }

  const attendeesWithShares = tickets.map((ticket) => {
    const shareId = ticketShares.get(ticket.id);
    if (!shareId) throw new Error(`Attendee ${ticket.id} still has no share ID after provisioning`);
    return { ...ticket, share_id: shareId };
  });
  const sponsorsWithShares = sponsors.map((sponsor) => {
    const shareId = sponsorShares.get(sponsor.id);
    if (!shareId) throw new Error(`Sponsor ${sponsor.id} still has no share ID after provisioning`);
    return { ...sponsor, share_id: shareId };
  });

  return { attendees: attendeesWithShares, speakers: publicSpeakers, sponsors: sponsorsWithShares };
}
