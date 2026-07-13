/**
 * Discount Popup Personalization
 *
 * Matches the visitor's detected tech stack (from the tech stack detector)
 * against the public speaker lineup, so the popup can say "React folks like
 * Ada Lovelace are speaking" instead of a generic message.
 *
 * Pure functions — no fetching, no PostHog. Callers supply the traits and the
 * speaker list (already cached by TanStack Query on the homepage).
 */

import type { PublicSpeaker } from '@/lib/types/cfp/public';
import type { FrameworkPrimary } from '@/lib/analytics/techStackDetector';

export interface DiscountPersonalization {
  /** Detected framework key, e.g. 'react' */
  stack: Exclude<FrameworkPrimary, 'unknown'>;
  /** Human-readable framework name, e.g. 'React' */
  stackDisplayName: string;
  /** Up to MAX_SPEAKER_NAMES matching speaker full names, best matches first */
  speakerNames: string[];
  /** Total number of matching speakers (may exceed speakerNames.length) */
  matchCount: number;
}

const MAX_SPEAKER_NAMES = 2;

interface StackMatcher {
  displayName: string;
  /** Exact (case-insensitive) tag values that indicate this stack */
  tags: string[];
  /** Word-boundary regex applied to session titles */
  titlePattern: RegExp;
}

const STACK_MATCHERS: Record<Exclude<FrameworkPrimary, 'unknown'>, StackMatcher> = {
  react: {
    displayName: 'React',
    tags: ['react', 'reactjs', 'react.js', 'react native', 'next.js', 'nextjs', 'remix'],
    titlePattern: /\breact(\.js|js)?\b|\bnext\.?js\b|\bremix\b/i,
  },
  preact: {
    displayName: 'Preact',
    tags: ['preact', 'preactjs'],
    titlePattern: /\bpreact\b/i,
  },
  vue: {
    displayName: 'Vue',
    tags: ['vue', 'vuejs', 'vue.js', 'nuxt', 'nuxtjs', 'pinia'],
    titlePattern: /\bvue(\.js|js)?\b|\bnuxt\b|\bpinia\b/i,
  },
  angular: {
    displayName: 'Angular',
    tags: ['angular', 'angularjs', 'ngrx', 'rxjs'],
    titlePattern: /\bangular\b|\bngrx\b|\brxjs\b/i,
  },
  svelte: {
    displayName: 'Svelte',
    tags: ['svelte', 'sveltekit', 'svelte kit'],
    titlePattern: /\bsvelte(kit)?\b/i,
  },
  solid: {
    displayName: 'Solid',
    tags: ['solid', 'solidjs', 'solid.js', 'solid-js'],
    // Deliberately require the js suffix in prose to avoid "SOLID principles"
    titlePattern: /\bsolid[\s.-]?js\b/i,
  },
};

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

/** Score a speaker against a stack: number of matching tags/sessions. */
function scoreSpeaker(speaker: PublicSpeaker, matcher: StackMatcher): number {
  const wantedTags = new Set(matcher.tags);
  let score = 0;

  for (const tag of speaker.tags ?? []) {
    if (wantedTags.has(normalizeTag(tag))) score += 2;
  }

  for (const session of speaker.sessions ?? []) {
    for (const tag of session.tags ?? []) {
      if (wantedTags.has(normalizeTag(tag))) score += 2;
    }
    if (matcher.titlePattern.test(session.title)) score += 1;
  }

  return score;
}

function speakerFullName(speaker: PublicSpeaker): string {
  return [speaker.first_name, speaker.last_name].filter(Boolean).join(' ').trim();
}

/**
 * Builds popup personalization from detected traits + the speaker lineup.
 * Returns null when there's nothing confident to say (unknown stack, no
 * matching speakers) — callers fall back to the generic popup copy.
 */
export function buildDiscountPersonalization(
  framework: FrameworkPrimary | null | undefined,
  speakers: PublicSpeaker[] | null | undefined
): DiscountPersonalization | null {
  if (!framework || framework === 'unknown' || !speakers?.length) {
    return null;
  }

  const matcher = STACK_MATCHERS[framework];
  if (!matcher) {
    return null;
  }

  const matches = speakers
    .map((speaker) => ({ speaker, score: scoreSpeaker(speaker, matcher) }))
    .filter((entry) => entry.score > 0 && speakerFullName(entry.speaker).length > 0)
    .sort((a, b) => {
      // Featured speakers first, then by match strength
      if (a.speaker.is_featured !== b.speaker.is_featured) {
        return a.speaker.is_featured ? -1 : 1;
      }
      return b.score - a.score;
    });

  if (matches.length === 0) {
    return null;
  }

  return {
    stack: framework,
    stackDisplayName: matcher.displayName,
    speakerNames: matches.slice(0, MAX_SPEAKER_NAMES).map((m) => speakerFullName(m.speaker)),
    matchCount: matches.length,
  };
}
