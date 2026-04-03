/**
 * CFP closure and reopen window helpers.
 */

const CFP_CLOSES_AT_UTC = '2026-04-03T21:59:59.000Z';
const CFP_CLOSES_AT_MS = new Date(CFP_CLOSES_AT_UTC).getTime();

export const CFP_MEETUP_CFP_URL = 'https://www.zurichjs.com/cfp?utm_source=conf&utm_medium=confwebsite';
export const CFP_CLOSED_ERROR_CODE = 'CFP_CLOSED';

export interface CfpSubmissionMetadata {
  reopen_until?: string;
  [key: string]: unknown;
}

export function getCfpCloseDate(): Date {
  return new Date(CFP_CLOSES_AT_UTC);
}

export function isCfpClosed(now: Date = new Date()): boolean {
  return now.getTime() >= CFP_CLOSES_AT_MS;
}

export function getReopenUntilFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const reopenUntil = (metadata as CfpSubmissionMetadata).reopen_until;
  if (typeof reopenUntil !== 'string' || reopenUntil.trim().length === 0) {
    return null;
  }

  return reopenUntil;
}

export function isSubmissionReopenActive(metadata: unknown, now: Date = new Date()): boolean {
  const reopenUntil = getReopenUntilFromMetadata(metadata);
  if (!reopenUntil) {
    return false;
  }

  const reopenAt = new Date(reopenUntil);
  if (Number.isNaN(reopenAt.getTime())) {
    return false;
  }

  return now.getTime() < reopenAt.getTime();
}

export function isCfpClosedForSubmission(metadata: unknown, now: Date = new Date()): boolean {
  if (!isCfpClosed(now)) {
    return false;
  }

  return !isSubmissionReopenActive(metadata, now);
}

export function canCreateSubmissionNow(now: Date = new Date()): boolean {
  return !isCfpClosed(now);
}

export function canSubmitOrEditSubmission(metadata: unknown, now: Date = new Date()): boolean {
  return !isCfpClosedForSubmission(metadata, now);
}
