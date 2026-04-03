/**
 * CFP closure and reopen window helpers.
 */

import { timelineData } from '@/data/timeline';

// take over from shared dates.
const CFP_ENDS_DATE_ISO =
  timelineData.entries.find((entry) => entry.id === 'cfp-ends')?.dateISO ?? '2026-04-03';
// end of that date in CEST
const CFP_CLOSES_AT_UTC = `${CFP_ENDS_DATE_ISO}T21:59:59.000Z`;
// time in ms
const CFP_CLOSES_AT_MS = new Date(CFP_CLOSES_AT_UTC).getTime();

export const CFP_MEETUP_CFP_URL = 'https://www.zurichjs.com/cfp?utm_source=conf&utm_medium=confwebsite';
export const CFP_CLOSED_ERROR_CODE = 'CFP_CLOSED';

export interface CfpSubmissionMetadata {
  [key: string]: unknown;
}

export function getCfpCloseDate(): Date {
  return new Date(CFP_CLOSES_AT_UTC);
}

export function isCfpClosed(now: Date = new Date()): boolean {
  return now.getTime() >= CFP_CLOSES_AT_MS;
}

export function isCfpClosedForSubmission(_metadata: unknown, now: Date = new Date()): boolean {
  return isCfpClosed(now);
}

export function canCreateSubmissionNow(now: Date = new Date()): boolean {
  return !isCfpClosed(now);
}

export function canSubmitOrEditSubmission(
  _submission: { metadata?: unknown; submitted_at?: string | null },
  now: Date = new Date()
): boolean {
  return !isCfpClosed(now);
}

export function isSubmissionClosedForSpeaker(
  _submission: { metadata?: unknown; submitted_at?: string | null },
  now: Date = new Date()
): boolean {
  return isCfpClosed(now);
}
