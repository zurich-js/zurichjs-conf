import type { PublicSession, PublicSpeaker } from '@/lib/types/cfp';
import { absoluteUrl, compactText, formatDate, frontmatter } from './common';

function fullName(speaker: PublicSpeaker): string {
  return [speaker.first_name, speaker.last_name].filter(Boolean).join(' ').trim();
}

function role(speaker: PublicSpeaker): string {
  return [speaker.job_title, speaker.company].filter(Boolean).join(' @ ').trim();
}

function socialsRecord(speaker: PublicSpeaker): Record<string, string> {
  const socials: Record<string, string> = {};
  const s = speaker.socials;
  if (s.linkedin_url) socials.linkedin = s.linkedin_url;
  if (s.github_url) socials.github = s.github_url;
  if (s.twitter_handle) socials.twitter = `https://twitter.com/${s.twitter_handle.replace(/^@/, '')}`;
  if (s.bluesky_handle) socials.bluesky = `https://bsky.app/profile/${s.bluesky_handle.replace(/^@/, '')}`;
  if (s.mastodon_handle) socials.mastodon = s.mastodon_handle;
  return socials;
}

function sessionTypeLabel(type: PublicSession['type']): string {
  switch (type) {
    case 'workshop':
      return 'workshop';
    case 'panel':
      return 'panel';
    case 'lightning':
      return 'lightning talk';
    case 'standard':
    default:
      return 'talk';
  }
}

function sessionLink(session: PublicSession): string {
  if (session.type === 'workshop') return absoluteUrl(`/workshops/${session.slug}`);
  if (session.type === 'panel') return absoluteUrl(`/schedule#${session.slug}`);
  return absoluteUrl(`/talks/${session.slug}`);
}

function renderSpeakerSessionBlock(session: PublicSession): string {
  const parts: string[] = [`### ${session.title}`];
  const meta: string[] = [sessionTypeLabel(session.type), session.level];
  const schedule = session.schedule;
  if (schedule?.date) {
    const date = formatDate(schedule.date);
    const time =
      schedule.start_time && schedule.duration_minutes
        ? `${schedule.start_time} (${schedule.duration_minutes} min)`
        : schedule.start_time ?? '';
    meta.push([date, time, schedule.room].filter(Boolean).join(' · '));
  }
  parts.push(`_${meta.filter(Boolean).join(' · ')}_`);
  parts.push(`Link: ${sessionLink(session)}`);
  if (session.tags.length > 0) parts.push(`Tags: ${session.tags.join(', ')}`);
  const abstract = compactText(session.abstract);
  if (abstract) parts.push('', abstract);
  return parts.join('\n');
}

export function serializeSpeaker(speaker: PublicSpeaker): string {
  const name = fullName(speaker);
  const speakerRole = role(speaker);
  const tags = speaker.tags ?? [];
  const socials = socialsRecord(speaker);

  const fm = frontmatter({
    slug: speaker.slug,
    name,
    role: speakerRole || null,
    type: speaker.speaker_role,
    featured: speaker.is_featured,
    tags: tags.length > 0 ? tags : null,
    socials: Object.keys(socials).length > 0 ? socials : null,
    url: absoluteUrl(`/speakers/${speaker.slug}`),
  });

  const sections: string[] = [fm, '', `# ${name || speaker.slug}`];
  if (speakerRole) sections.push('', `_${speakerRole}_`);

  const bio = compactText(speaker.bio);
  if (bio) sections.push('', '## Bio', '', bio);

  const sessions = speaker.sessions ?? [];
  if (sessions.length > 0) {
    sections.push('', '## Sessions');
    for (const session of sessions) {
      sections.push('', renderSpeakerSessionBlock(session));
    }
  }

  return sections.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

export function serializeSpeakerList(speakers: PublicSpeaker[]): string {
  const fm = frontmatter({
    title: 'ZurichJS Conf 2026 — Speaker Lineup',
    count: speakers.length,
    url: absoluteUrl('/speakers'),
  });

  const sections: string[] = [fm, '', '# Speaker Lineup', ''];
  sections.push(
    `${speakers.length} speaker${speakers.length === 1 ? '' : 's'} confirmed for ZurichJS Conf 2026.`,
    ''
  );

  for (const speaker of speakers) {
    const name = fullName(speaker);
    const speakerRole = role(speaker);
    const url = absoluteUrl(`/speakers/${speaker.slug}`);
    sections.push(`## [${name || speaker.slug}](${url})`);
    const metaLine: string[] = [];
    if (speakerRole) metaLine.push(speakerRole);
    if (speaker.is_featured) metaLine.push('Featured');
    if (speaker.speaker_role === 'mc') metaLine.push('MC');
    if (metaLine.length > 0) sections.push(`_${metaLine.join(' · ')}_`);
    if (speaker.tags?.length > 0) sections.push(`Tags: ${speaker.tags.join(', ')}`);
    const sessions = speaker.sessions ?? [];
    if (sessions.length > 0) {
      sections.push(
        'Sessions: ' +
          sessions
            .map((session) => `[${session.title}](${sessionLink(session)})`)
            .join('; ')
      );
    }
    sections.push('');
  }

  return sections.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
