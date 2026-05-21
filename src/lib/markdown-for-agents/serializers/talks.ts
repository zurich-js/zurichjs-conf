import type { PublicSession } from '@/lib/types/cfp';
import { absoluteUrl, compactText, formatDate, frontmatter } from './common';

function speakerLine(session: PublicSession): string {
  const speakers = session.speakers ?? [];
  if (speakers.length === 0) return '';
  return speakers
    .map((sp) => {
      const link = sp.slug ? absoluteUrl(`/speakers/${sp.slug}`) : null;
      const namePart = link ? `[${sp.name}](${link})` : sp.name;
      return sp.role ? `${namePart} — ${sp.role}` : namePart;
    })
    .join(', ');
}

function scheduleLine(session: PublicSession): string | null {
  const s = session.schedule;
  if (!s?.date && !s?.start_time) return null;
  const parts: string[] = [];
  const date = formatDate(s?.date);
  if (date) parts.push(date);
  if (s?.start_time && s.duration_minutes) {
    parts.push(`${s.start_time} (${s.duration_minutes} min)`);
  } else if (s?.start_time) {
    parts.push(s.start_time);
  }
  if (s?.room) parts.push(s.room);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function serializeTalk(session: PublicSession): string {
  const schedule = session.schedule;
  const fm = frontmatter({
    slug: session.slug,
    title: session.title,
    type: session.type,
    level: session.level,
    date: schedule?.date ?? null,
    start_time: schedule?.start_time ?? null,
    duration_minutes: schedule?.duration_minutes ?? null,
    room: schedule?.room ?? null,
    tags: session.tags?.length > 0 ? session.tags : null,
    speakers:
      (session.speakers ?? []).map((sp) => ({
        name: sp.name,
        slug: sp.slug ?? null,
        role: sp.role ?? null,
      })) ?? null,
    url: absoluteUrl(`/talks/${session.slug}`),
  });

  const sections: string[] = [fm, '', `# ${session.title}`];
  const speakers = speakerLine(session);
  if (speakers) sections.push('', `**Speakers:** ${speakers}`);
  const when = scheduleLine(session);
  if (when) sections.push('', `**When:** ${when}`);
  const meta: string[] = [];
  if (session.level) meta.push(`Level: ${session.level}`);
  if (session.tags?.length > 0) meta.push(`Tags: ${session.tags.join(', ')}`);
  if (meta.length > 0) sections.push('', meta.join(' · '));

  const abstract = compactText(session.abstract);
  if (abstract) sections.push('', '## Abstract', '', abstract);

  return sections.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

export function serializeTalksList(talks: PublicSession[]): string {
  const sorted = [...talks].sort((a, b) => {
    const left = `${a.schedule?.date ?? '9999-12-31'}T${a.schedule?.start_time ?? '23:59'}`;
    const right = `${b.schedule?.date ?? '9999-12-31'}T${b.schedule?.start_time ?? '23:59'}`;
    if (left !== right) return left.localeCompare(right);
    return a.title.localeCompare(b.title);
  });

  const fm = frontmatter({
    title: 'ZurichJS Conf 2026 — Talks',
    count: sorted.length,
    url: absoluteUrl('/talks'),
  });

  const sections: string[] = [fm, '', '# Talks', ''];
  sections.push(
    `${sorted.length} talk${sorted.length === 1 ? '' : 's'} on the conference programme.`,
    ''
  );

  for (const talk of sorted) {
    const url = absoluteUrl(`/talks/${talk.slug}`);
    sections.push(`## [${talk.title}](${url})`);
    const sp = speakerLine(talk);
    if (sp) sections.push(`**Speakers:** ${sp}`);
    const when = scheduleLine(talk);
    if (when) sections.push(`**When:** ${when}`);
    const meta: string[] = [`Level: ${talk.level}`];
    if (talk.tags?.length > 0) meta.push(`Tags: ${talk.tags.join(', ')}`);
    sections.push(meta.join(' · '));
    const abstract = compactText(talk.abstract);
    if (abstract) {
      const oneLiner =
        abstract.length > 280 ? `${abstract.slice(0, 277).trimEnd()}…` : abstract;
      sections.push('', oneLiner);
    }
    sections.push('');
  }

  return sections.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
