import crypto from 'crypto';

interface SpeakerIdentity {
  first_name: string;
  last_name: string;
}

export interface SpeakerGuideAccess {
  slug: string;
  code: string;
  path: string;
}

export function createSpeakerGuideSlug(speaker: SpeakerIdentity): string {
  return `${speaker.first_name} ${speaker.last_name}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function createSpeakerGuideCode(slug: string): string {
  return crypto
    .createHash('sha256')
    .update(`zurichjs-speaker-guide-2026:${slug}`)
    .digest('base64url')
    .slice(0, 18);
}

export function getSpeakerGuideAccess(speaker: SpeakerIdentity): SpeakerGuideAccess {
  const slug = createSpeakerGuideSlug(speaker);
  const code = createSpeakerGuideCode(slug);

  return {
    slug,
    code,
    path: `/speaker-guide/${code}`,
  };
}
