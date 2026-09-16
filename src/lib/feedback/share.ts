/**
 * Unlisted per-speaker feedback share links.
 *
 * Organisers need to hand a speaker their own ratings and comments without
 * giving them an account, and without exposing anyone else's numbers. Each
 * speaker therefore gets one unlisted URL:
 *
 *     /speaker-feedback/<name-slug>-<code>
 *
 * The name slug is cosmetic — it just makes the link recognisable when it is
 * pasted into an email — and is ignored when the link is resolved. The `code`
 * is the credential: a keyed SHA-256 hash (HMAC) of the speaker id, truncated
 * to 24 base64url characters (~144 bits), so it cannot be guessed, enumerated,
 * or derived from a speaker's name by anyone without the signing secret.
 *
 * Deriving rather than storing the code keeps links stable across schedule
 * edits and name changes, and means no extra table: the trade-off is that a
 * single link cannot be revoked on its own — rotating `ORDER_TOKEN_SECRET`
 * invalidates every unlisted link on the site at once.
 *
 * The scope prefix below is baked into the signature so a feedback code can
 * never be replayed against the order, logistics or speaker-guide flows that
 * share the same secret.
 */

import crypto from 'crypto';
import type { SpeakerFeedbackShare } from '@/lib/types/session-feedback';

const CODE_SCOPE = 'speaker-feedback-share';

/** Base64url characters of HMAC output kept in a share code (~144 bits of entropy). */
export const SPEAKER_FEEDBACK_CODE_LENGTH = 24;

/** Route the unlisted share pages live under. */
export const SPEAKER_FEEDBACK_BASE_PATH = '/speaker-feedback';

const CODE_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${SPEAKER_FEEDBACK_CODE_LENGTH}}$`);

function getSigningSecret(): string {
  const secret = process.env.ORDER_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error('ORDER_TOKEN_SECRET or NEXTAUTH_SECRET must be configured');
  }

  return secret;
}

/** URL-safe form of a speaker's display name; empty when the name has no usable characters. */
export function createSpeakerFeedbackSlug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The unguessable half of a speaker's share link.
 *
 * Signs the speaker's id rather than their name: two speakers whose names
 * normalize to the same slug must never share a code, and correcting a typo in
 * a name must not break a link that has already been sent.
 */
export function createSpeakerFeedbackCode(speakerId: string): string {
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update(`${CODE_SCOPE}:${speakerId}`)
    .digest('base64url')
    .slice(0, SPEAKER_FEEDBACK_CODE_LENGTH);
}

/** Slug, code and site-relative path of a speaker's unlisted feedback page. */
export function buildSpeakerFeedbackShare(speakerId: string, name: string): SpeakerFeedbackShare {
  const slug = createSpeakerFeedbackSlug(name);
  const code = createSpeakerFeedbackCode(speakerId);

  return {
    slug,
    code,
    path: `${SPEAKER_FEEDBACK_BASE_PATH}/${slug ? `${slug}-` : ''}${code}`,
  };
}

/**
 * Pull the credential out of a `<name-slug>-<code>` route parameter.
 *
 * Returns null for anything that cannot be a share link, so the page can 404
 * without touching the database.
 */
export function parseSpeakerFeedbackShareParam(param: string): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(param)) return null;

  const code = param.slice(-SPEAKER_FEEDBACK_CODE_LENGTH);
  if (!CODE_PATTERN.test(code)) return null;

  // Whatever precedes the code is the cosmetic slug and must end at its separator
  const prefix = param.slice(0, -SPEAKER_FEEDBACK_CODE_LENGTH);
  if (prefix.length > 0 && !prefix.endsWith('-')) return null;

  return code;
}

/** Whether `code` is the share code for `speakerId`, compared in constant time. */
export function speakerFeedbackCodeMatches(speakerId: string, code: string): boolean {
  const provided = Buffer.from(code);
  const expected = Buffer.from(createSpeakerFeedbackCode(speakerId));

  // timingSafeEqual throws on a length mismatch — reject those up front
  if (provided.length !== expected.length) return false;

  return crypto.timingSafeEqual(provided, expected);
}

/** The speaker a share code belongs to, or null when it matches none of them. */
export function findSpeakerIdByFeedbackCode(speakerIds: string[], code: string): string | null {
  return speakerIds.find((speakerId) => speakerFeedbackCodeMatches(speakerId, code)) ?? null;
}
