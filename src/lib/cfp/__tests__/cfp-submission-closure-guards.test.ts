import { describe, expect, it } from 'vitest';
import { getCfpCloseDate, isCfpClosed } from '../closure';

describe('submission closure guards', () => {
  it('blocks create after CFP close', () => {
    const closeDate = getCfpCloseDate();
    expect(isCfpClosed(new Date(closeDate.getTime() - 1))).toBe(false);
    expect(isCfpClosed(closeDate)).toBe(true);
  });

  it('blocks submit/edit after close', () => {
    expect(isCfpClosed(new Date('2026-04-10T10:00:00.000Z'))).toBe(true);
  });

  it('keeps submit/edit open before the close instant', () => {
    const closeDate = getCfpCloseDate();
    expect(isCfpClosed(new Date(closeDate.getTime() - 1))).toBe(false);
  });
});
