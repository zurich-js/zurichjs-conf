import { describe, expect, it } from 'vitest';
import {
  getCfpCloseDate,
  isCfpClosed,
  isCfpClosedForSubmission,
} from '../closure';

describe('CFP closure timing', () => {
  it('is open just before close and closed at close timestamp', () => {
    const closeDate = getCfpCloseDate();
    const justBeforeClose = new Date(closeDate.getTime() - 1);

    expect(isCfpClosed(justBeforeClose)).toBe(false);
    expect(isCfpClosed(closeDate)).toBe(true);
  });
});

describe('submission closure behavior', () => {
  it('marks submission as closed when CFP is closed', () => {
    const now = new Date('2026-04-10T12:00:00.000Z');
    expect(isCfpClosedForSubmission({}, now)).toBe(true);
  });
});
