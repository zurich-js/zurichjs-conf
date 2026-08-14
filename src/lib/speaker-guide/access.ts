import crypto from 'crypto';

// Domain scope baked into the signature so a guide code can never be derived
// from (or replayed against) the order/logistics token flows that share the
// same signing secret.
const CODE_SCOPE = 'speaker-guide-code';

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

function getSigningSecret(): string {
  const secret = process.env.ORDER_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error('ORDER_TOKEN_SECRET or NEXTAUTH_SECRET must be configured');
  }

  return secret;
}

export function createSpeakerGuideCode(slug: string): string {
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update(`${CODE_SCOPE}:${slug}`)
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
