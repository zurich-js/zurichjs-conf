import { describe, expect, it } from 'vitest';
import {
  getCfpCloseDate,
  isCfpClosed,
} from '../closure';

describe('CFP closure timing', () => {
  it('is open just before close and closed at close timestamp', () => {
    const closeDate = getCfpCloseDate();
    const justBeforeClose = new Date(closeDate.getTime() - 1);

    expect(isCfpClosed(justBeforeClose)).toBe(false);
    expect(isCfpClosed(closeDate)).toBe(true);
  });
  it('uses Zurich end of day for the timeline close date', () => {
    expect(getCfpCloseDate().toISOString()).toBe('2026-04-03T21:59:59.000Z');
  });
});
