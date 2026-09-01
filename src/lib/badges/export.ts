export type BadgeCategory = 'vip' | 'attendee' | 'speaker' | 'sponsor';

export interface BadgeEntry {
  category: BadgeCategory;
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  company: string;
  publicId: string;
  qrUrl: string;
  logoUrl: string | null;
}

export interface AttendeeBadgeSource {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  job_title: string | null;
  ticket_category: string;
  share_id: string;
}

export interface SpeakerBadgeSource {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  company: string | null;
  job_title: string | null;
}

export interface SponsorBadgeSource {
  id: string;
  company_name: string;
  contact_name: string;
  logo_url: string | null;
  logo_url_color: string | null;
  share_id: string;
}

export interface BadgeExportSources {
  attendees: AttendeeBadgeSource[];
  speakers: SpeakerBadgeSource[];
  sponsors: SponsorBadgeSource[];
}

const CATEGORIES: BadgeCategory[] = ['vip', 'attendee', 'speaker', 'sponsor'];

function qrUrl(baseUrl: string, publicId: string): string {
  const url = new URL(`/share/${publicId}`, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  url.searchParams.set('utm_source', 'offline');
  url.searchParams.set('utm_medium', 'qr_code');
  url.searchParams.set('utm_campaign', 'zurichjs_networking');
  return url.toString();
}

export function splitContactName(value: string): { firstName: string; lastName: string } {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? '', lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) ?? '' };
}

export function buildBadgeEntries(sources: BadgeExportSources, baseUrl: string): BadgeEntry[] {
  const attendeeEntries = sources.attendees.map((attendee): BadgeEntry => {
    const category: BadgeCategory = attendee.ticket_category === 'vip' ? 'vip' : 'attendee';
    const publicId = `attendee-${attendee.share_id}`;
    return {
      category,
      id: attendee.id,
      firstName: attendee.first_name,
      lastName: attendee.last_name,
      role: attendee.job_title ?? '',
      company: attendee.company ?? '',
      publicId,
      qrUrl: qrUrl(baseUrl, publicId),
      logoUrl: null,
    };
  });

  const speakerEntries = sources.speakers.map((speaker): BadgeEntry => {
    const publicId = `speaker-${speaker.slug}`;
    return {
      category: 'speaker',
      id: speaker.id,
      firstName: speaker.first_name,
      lastName: speaker.last_name,
      role: speaker.job_title ?? '',
      company: speaker.company ?? '',
      publicId,
      qrUrl: qrUrl(baseUrl, publicId),
      logoUrl: null,
    };
  });

  const sponsorEntries = sources.sponsors.map((sponsor): BadgeEntry => {
    const contact = splitContactName(sponsor.contact_name);
    const publicId = `sponsor-${sponsor.share_id}`;
    return {
      category: 'sponsor',
      id: sponsor.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      role: 'Sponsor',
      company: sponsor.company_name,
      publicId,
      qrUrl: qrUrl(baseUrl, publicId),
      logoUrl: sponsor.logo_url_color ?? sponsor.logo_url,
    };
  });

  return [...attendeeEntries, ...speakerEntries, ...sponsorEntries];
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function csvLine(values: string[]): string {
  return `${values.map(csvCell).join(',')}\n`;
}

export function categoryCsv(
  category: BadgeCategory,
  entries: BadgeEntry[],
  qrPaths: ReadonlyMap<string, string>,
  logoPaths: ReadonlyMap<string, string>
): string {
  const prefix = category;
  const headers = [
    `${prefix}_first_name`,
    `${prefix}_last_name`,
    `${prefix}_role`,
    `${prefix}_company`,
    `@${prefix}_qr`,
  ];
  if (category === 'sponsor') headers.push('@sponsor_logo');

  let csv = csvLine(headers);
  for (const entry of entries.filter((candidate) => candidate.category === category)) {
    const row = [
      entry.firstName,
      entry.lastName,
      entry.role,
      entry.company,
      qrPaths.get(entry.id) ?? '',
    ];
    if (category === 'sponsor') row.push(logoPaths.get(entry.id) ?? '');
    csv += csvLine(row);
  }
  return csv;
}

export function combinedCsv(
  entries: BadgeEntry[],
  qrPaths: ReadonlyMap<string, string>,
  logoPaths: ReadonlyMap<string, string>
): string {
  const fields = CATEGORIES.flatMap((category) => [
    `${category}_first_name`,
    `${category}_last_name`,
    `${category}_role`,
    `${category}_company`,
    `@${category}_qr`,
    ...(category === 'sponsor' ? ['@sponsor_logo'] : []),
  ]);

  let csv = csvLine(fields);
  for (const entry of entries) {
    const values = new Map<string, string>([
      [`${entry.category}_first_name`, entry.firstName],
      [`${entry.category}_last_name`, entry.lastName],
      [`${entry.category}_role`, entry.role],
      [`${entry.category}_company`, entry.company],
      [`@${entry.category}_qr`, qrPaths.get(entry.id) ?? ''],
    ]);
    if (entry.category === 'sponsor') {
      values.set('@sponsor_logo', logoPaths.get(entry.id) ?? '');
    }
    csv += csvLine(fields.map((field) => values.get(field) ?? ''));
  }
  return csv;
}

export const badgeCategories = CATEGORIES;
