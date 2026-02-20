/**
 * Easter Egg Partner Challenge Definitions
 *
 * Each partner has a hint (sent to client) and an expectedAnswer (server-only).
 * Answers are validated case-insensitively with trimmed whitespace.
 */

import type { EasterEggPartner } from './types';

interface PartnerDefinition extends EasterEggPartner {
  expectedAnswer: string;
}

const UTM_PARAMS = 'utm_source=zurichjs&utm_medium=easter_egg&utm_campaign=challenge';

const partners: PartnerDefinition[] = [
  {
    id: 'vercel',
    displayName: 'Vercel',
    url: `https://vercel.com?${UTM_PARAMS}`,
    hint: "What's the name of Vercel's free plan/tier?",
    expectedAnswer: 'Hobby',
  },
];

/** Returns the partner list WITHOUT expectedAnswer (safe for client) */
export function getPartners(): EasterEggPartner[] {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return partners.map(({ expectedAnswer: _, ...partner }) => partner);
}

/** Returns a partner by 1-based index (as shown in the console list) */
export function getPartnerByIndex(index: number): PartnerDefinition | undefined {
  return partners[index - 1];
}

/**
 * Normalize a string for fuzzy comparison:
 * lowercase, strip punctuation, collapse whitespace.
 * "Dream it, Ship it." → "dream it ship it"
 */
function normalize(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // strip punctuation
    .replace(/\s+/g, ' '); // collapse whitespace
}

/** Validates a challenge answer server-side. Fuzzy: ignores case, punctuation, extra whitespace. */
export function validateAnswer(partnerId: string, answer: string): { valid: boolean; partnerName?: string } {
  const partner = partners.find((p) => p.id === partnerId);
  if (!partner) {
    return { valid: false };
  }

  return {
    valid: normalize(answer) === normalize(partner.expectedAnswer),
    partnerName: partner.displayName,
  };
}
