/**
 * CFP closure helpers.
 */

import { timelineData } from '@/data/timeline';
import { zurichWallClockToUtc } from '@/lib/time/zurich';

const CFP_ENDS_DATE_ISO =
  timelineData.entries.find((entry) => entry.id === 'cfp-ends')?.dateISO ?? '2026-04-03';

// CFP closes at the end of the Zurich-local day.
const CFP_CLOSE_DATE = zurichWallClockToUtc(CFP_ENDS_DATE_ISO, '23:59:59');
const CFP_CLOSES_AT_MS = CFP_CLOSE_DATE.getTime();

export const CFP_MEETUP_CFP_URL = 'https://www.zurichjs.com/cfp?utm_source=conf&utm_medium=confwebsite';
export const CFP_CLOSED_ERROR_CODE = 'CFP_CLOSED';

export function getCfpCloseDate(): Date {
  return new Date(CFP_CLOSE_DATE);
}

export function isCfpClosed(now: Date = new Date()): boolean {
  return now.getTime() >= CFP_CLOSES_AT_MS;
}
