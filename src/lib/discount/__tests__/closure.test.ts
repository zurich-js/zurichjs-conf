/**
 * Tests for the discount popup closure date.
 */

import { describe, it, expect } from 'vitest';
import {
  DISCOUNT_POPUP_CLOSE_DATE_ISO,
  getDiscountPopupCloseDate,
  getDiscountClosureCheckDelayMs,
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

describe('getDiscountClosureCheckDelayMs', () => {
  it('returns the exact wait while the window is still open', () => {
    // 22:00 UTC on the 10th is the cutoff, so one minute earlier is 60s out.
    expect(getDiscountClosureCheckDelayMs(new Date('2026-09-10T21:59:00.000Z'))).toBe(60_000);
  });

  it('clamps a far-off wait to what setTimeout can hold', () => {
    // Anything past ~24.8 days would wrap a 32-bit int and fire immediately;
    // the caller re-schedules from the clamped value instead.
    expect(getDiscountClosureCheckDelayMs(new Date('2020-01-01T00:00:00.000Z'))).toBe(2_147_483_647);
  });

  it('returns null from the cutoff onwards — a mounted hook stops waiting', () => {
    expect(getDiscountClosureCheckDelayMs(new Date('2026-09-10T22:00:00.000Z'))).toBeNull();
    expect(getDiscountClosureCheckDelayMs(new Date('2026-09-11T08:30:00.000Z'))).toBeNull();
  });

  it('a session open across the cutoff sees the value flip on re-check', () => {
    // The regression: the same still-mounted session, re-reading the clock.
    const beforeCutoff = new Date('2026-09-10T21:30:00.000Z');
    const afterCutoff = new Date('2026-09-10T22:30:00.000Z');

    expect(isDiscountPopupClosed(beforeCutoff)).toBe(false);
    expect(getDiscountClosureCheckDelayMs(beforeCutoff)).toBe(30 * 60_000);

    expect(isDiscountPopupClosed(afterCutoff)).toBe(true);
    expect(getDiscountClosureCheckDelayMs(afterCutoff)).toBeNull();
  });
});
