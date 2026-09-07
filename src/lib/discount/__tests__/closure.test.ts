/**
 * Tests for the discount popup closure date.
 */

import { describe, it, expect } from 'vitest';
import {
  DISCOUNT_POPUP_CLOSE_DATE_ISO,
  getDiscountPopupCloseDate,
  isDiscountPopupClosed,
} from '../closure';

describe('isDiscountPopupClosed', () => {
  it('is open the day before the cutoff', () => {
    expect(isDiscountPopupClosed(new Date('2026-09-10T12:00:00.000Z'))).toBe(false);
  });

  it('is open in the final minute before Zurich midnight on the 11th', () => {
    // 21:59 UTC = 23:59 Zurich (CEST) on the 10th
    expect(isDiscountPopupClosed(new Date('2026-09-10T21:59:59.000Z'))).toBe(false);
  });

  it('is closed from the start of the 11th in Zurich', () => {
    expect(isDiscountPopupClosed(new Date('2026-09-10T22:00:00.000Z'))).toBe(true);
  });

  it('is closed during conference day and after', () => {
    expect(isDiscountPopupClosed(new Date('2026-09-11T08:30:00.000Z'))).toBe(true);
    expect(isDiscountPopupClosed(new Date('2026-09-12T00:00:00.000Z'))).toBe(true);
    expect(isDiscountPopupClosed(new Date('2027-01-01T00:00:00.000Z'))).toBe(true);
  });
});

describe('getDiscountPopupCloseDate', () => {
  it('is Zurich midnight at the start of the advertised close date', () => {
    expect(getDiscountPopupCloseDate().toISOString()).toBe('2026-09-10T22:00:00.000Z');
    expect(DISCOUNT_POPUP_CLOSE_DATE_ISO).toBe('2026-09-11');
  });
});
