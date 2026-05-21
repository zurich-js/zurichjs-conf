import { getProgramSpeakerCount, getVisibleSpeakersWithSessions } from '@/lib/cfp/speakers';
import { buildPublicProgramScheduleItems, getPublicScheduleRows } from '@/lib/program/schedule';
import type { PublicSession, PublicSpeaker } from '@/lib/types/cfp';
import type { AgentResource } from '@/lib/analytics/events/agent-events';
import {
  serializeSchedule,
  serializeSpeaker,
  serializeSpeakerList,
  serializeTalk,
  serializeTalksList,
} from './serializers';

export interface AgentResourceMatch {
  resource: AgentResource;
  serve: () => Promise<{ status: 200; markdown: string } | { status: 404; markdown: string }>;
}

const TALK_TYPES: PublicSession['type'][] = ['standard', 'lightning'];

function findTalkBySlug(speakers: PublicSpeaker[], slug: string): PublicSession | null {
  for (const speaker of speakers) {
    for (const session of speaker.sessions) {
      if (TALK_TYPES.includes(session.type) && session.slug === slug) {
        return session;
      }
    }
  }
  return null;
}

function collectTalks(speakers: PublicSpeaker[]): PublicSession[] {
  const seen = new Set<string>();
  const talks: PublicSession[] = [];
  for (const speaker of speakers) {
    for (const session of speaker.sessions) {
      if (!TALK_TYPES.includes(session.type)) continue;
      const key = session.id || session.slug;
      if (seen.has(key)) continue;
      seen.add(key);
      talks.push(session);
    }
  }
  talks.sort((a, b) => {
    const left = `${a.schedule?.date ?? '9999-12-31'}T${a.schedule?.start_time ?? '23:59'}`;
    const right = `${b.schedule?.date ?? '9999-12-31'}T${b.schedule?.start_time ?? '23:59'}`;
    if (left !== right) return left.localeCompare(right);
    return a.title.localeCompare(b.title);
  });
  return talks;
}

function notFound(message: string) {
  return { status: 404 as const, markdown: `# Not found\n\n${message}\n` };
}

/**
 * Resolve an agent-friendly path to a resource handler. Returns `null` for
 * paths that aren't in the allowlist so the catch-all can 404 them.
 */
export function resolveAgentResource(segments: string[]): AgentResourceMatch | null {
  const [head, slug, ...rest] = segments;
  if (rest.length > 0) return null;

  if (!head) return null;

  if (head === 'schedule' && !slug) {
    return {
      resource: 'schedule',
      serve: async () => {
        const [rows, speakers] = await Promise.all([
          getPublicScheduleRows(),
          getVisibleSpeakersWithSessions(),
        ]);
        const items = buildPublicProgramScheduleItems(rows, speakers);
        return { status: 200, markdown: serializeSchedule(items) };
      },
    };
  }

  if (head === 'speakers' && !slug) {
    return {
      resource: 'speakers_list',
      serve: async () => {
        const speakers = await getVisibleSpeakersWithSessions();
        // Pull the program speaker count so the markdown can advertise it
        // — keeps parity with the existing /api/speakers endpoint.
        await getProgramSpeakerCount();
        return { status: 200, markdown: serializeSpeakerList(speakers) };
      },
    };
  }

  if (head === 'speakers' && slug) {
    return {
      resource: 'speaker_detail',
      serve: async () => {
        const speakers = await getVisibleSpeakersWithSessions();
        const speaker = speakers.find((s) => s.slug === slug);
        if (!speaker) return notFound(`Speaker \`${slug}\` not found.`);
        return { status: 200, markdown: serializeSpeaker(speaker) };
      },
    };
  }

  if (head === 'talks' && !slug) {
    return {
      resource: 'talks_list',
      serve: async () => {
        const speakers = await getVisibleSpeakersWithSessions();
        const talks = collectTalks(speakers);
        return { status: 200, markdown: serializeTalksList(talks) };
      },
    };
  }

  if (head === 'talks' && slug) {
    return {
      resource: 'talk_detail',
      serve: async () => {
        const speakers = await getVisibleSpeakersWithSessions();
        const talk = findTalkBySlug(speakers, slug);
        if (!talk) return notFound(`Talk \`${slug}\` not found.`);
        return { status: 200, markdown: serializeTalk(talk) };
      },
    };
  }

  return null;
}

/**
 * Allowlist of original page paths (no leading `/api/agent` prefix) that the
 * middleware should treat as agent-ready. Used both by the middleware and by
 * tests, so the list is authoritative.
 */
export const AGENT_PATH_ALLOWLIST: readonly RegExp[] = [
  /^\/schedule\/?$/,
  /^\/speakers\/?$/,
  /^\/speakers\/[A-Za-z0-9_-]+\/?$/,
  /^\/talks\/?$/,
  /^\/talks\/[A-Za-z0-9_-]+\/?$/,
] as const;

export function isAgentReadyPath(pathname: string): boolean {
  return AGENT_PATH_ALLOWLIST.some((re) => re.test(pathname));
}
