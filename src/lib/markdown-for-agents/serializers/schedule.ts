import type { PublicProgramScheduleItem } from '@/lib/types/program-schedule';
import { absoluteUrl, compactText, formatDate, frontmatter } from './common';

function itemLink(item: PublicProgramScheduleItem): string | null {
  const session = item.session;
  if (!session) return null;
  if (session.type === 'workshop') return absoluteUrl(`/workshops/${session.slug}`);
  if (session.type === 'panel') return null;
  if (item.session_kind === 'talk') return absoluteUrl(`/talks/${session.slug}`);
  return null;
}

function itemTitle(item: PublicProgramScheduleItem): string {
  if (item.session?.title) {
    const link = itemLink(item);
    return link ? `[${item.session.title}](${link})` : item.session.title;
  }
  return item.title || '—';
}

function itemSpeakers(item: PublicProgramScheduleItem): string {
  const speakers = item.speakers ?? [];
  if (speakers.length === 0) return '—';
  return speakers
    .map((sp) => (sp.slug ? `[${sp.name}](${absoluteUrl(`/speakers/${sp.slug}`)})` : sp.name))
    .join(', ');
}

function itemKindLabel(item: PublicProgramScheduleItem): string {
  if (item.type === 'break') return 'break';
  if (item.type === 'event') return 'event';
  if (item.session_kind) return item.session_kind;
  return item.type;
}

function escapeCell(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/**
 * Group schedule items by date in stable chronological order. Each group
 * preserves the original ordering of items (already sorted by start_time
 * upstream in `getPublicScheduleRows`).
 */
function groupByDate(
  items: PublicProgramScheduleItem[]
): Array<{ date: string; items: PublicProgramScheduleItem[] }> {
  const order: string[] = [];
  const groups = new Map<string, PublicProgramScheduleItem[]>();
  for (const item of items) {
    const key = item.date;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(item);
  }
  order.sort();
  return order.map((date) => ({ date, items: groups.get(date)! }));
}

export function serializeSchedule(items: PublicProgramScheduleItem[]): string {
  const visible = items.filter((item) => item.is_visible);
  const groups = groupByDate(visible);

  const fm = frontmatter({
    title: 'ZurichJS Conf 2026 — Schedule',
    days: groups.map((g) => g.date),
    item_count: visible.length,
    url: absoluteUrl('/schedule'),
  });

  const sections: string[] = [fm, '', '# ZurichJS Conf 2026 Schedule', ''];
  if (groups.length === 0) {
    sections.push('_Schedule not yet published._');
    return sections.join('\n').trimEnd() + '\n';
  }

  for (const group of groups) {
    const dateLabel = formatDate(group.date) ?? group.date;
    sections.push(`## ${dateLabel}`);
    sections.push('');
    sections.push('| Time | Room | Kind | Session | Speakers |');
    sections.push('| --- | --- | --- | --- | --- |');
    for (const item of group.items) {
      const timeCell = item.start_time
        ? `${item.start_time} (${item.duration_minutes} min)`
        : '—';
      const room = item.room ?? '—';
      const kind = itemKindLabel(item);
      const titleCell = escapeCell(itemTitle(item));
      const speakersCell = escapeCell(itemSpeakers(item));
      sections.push(`| ${timeCell} | ${room} | ${kind} | ${titleCell} | ${speakersCell} |`);
    }
    sections.push('');

    const annotated = group.items.filter((item) => {
      const desc = compactText(item.description);
      return desc && !item.session;
    });
    if (annotated.length > 0) {
      sections.push('### Notes', '');
      for (const item of annotated) {
        sections.push(`- **${item.title}** — ${compactText(item.description)}`);
      }
      sections.push('');
    }
  }

  return sections.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
