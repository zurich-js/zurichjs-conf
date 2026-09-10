import { describe, expect, it } from 'vitest';
import { getWorkshopPurchaseCloseDate, isWorkshopPurchaseClosed } from '../purchaseWindow';

describe('getWorkshopPurchaseCloseDate', () => {
  it('returns the Zurich-local start as a UTC instant (CEST, +02:00)', () => {
    const closesAt = getWorkshopPurchaseCloseDate({ date: '2026-09-10', start_time: '09:00:00' });
    expect(closesAt?.toISOString()).toBe('2026-09-10T07:00:00.000Z');
  });

  it('accepts HH:MM without seconds', () => {
    const closesAt = getWorkshopPurchaseCloseDate({ date: '2026-09-10', start_time: '14:30' });
    expect(closesAt?.toISOString()).toBe('2026-09-10T12:30:00.000Z');
  });

  it('handles winter time (CET, +01:00)', () => {
    const closesAt = getWorkshopPurchaseCloseDate({ date: '2026-01-15', start_time: '09:00:00' });
    expect(closesAt?.toISOString()).toBe('2026-01-15T08:00:00.000Z');
  });

  it('falls back to end of the Zurich day when only a date is known', () => {
    const closesAt = getWorkshopPurchaseCloseDate({ date: '2026-09-10', start_time: null });
    expect(closesAt?.toISOString()).toBe('2026-09-10T21:59:59.000Z');
  });

  it('returns null when there is no date to gate on', () => {
    expect(getWorkshopPurchaseCloseDate({ date: null, start_time: '09:00:00' })).toBeNull();
    expect(getWorkshopPurchaseCloseDate({ date: null, start_time: null })).toBeNull();
  });
});

describe('isWorkshopPurchaseClosed', () => {
  const workshop = { date: '2026-09-10', start_time: '09:00:00' };

  it('is open right up until the workshop starts', () => {
    const justBefore = new Date('2026-09-10T06:59:59.999Z');
    expect(isWorkshopPurchaseClosed(workshop, justBefore)).toBe(false);
  });

  it('closes exactly at the start instant', () => {
    expect(isWorkshopPurchaseClosed(workshop, new Date('2026-09-10T07:00:00.000Z'))).toBe(true);
  });

  it('stays closed afterwards', () => {
    expect(isWorkshopPurchaseClosed(workshop, new Date('2026-09-10T15:00:00.000Z'))).toBe(true);
    expect(isWorkshopPurchaseClosed(workshop, new Date('2026-09-11T09:00:00.000Z'))).toBe(true);
  });

  it('is open the day before', () => {
    expect(isWorkshopPurchaseClosed(workshop, new Date('2026-09-09T12:00:00.000Z'))).toBe(false);
  });

  it('never closes a workshop without a date', () => {
    expect(
      isWorkshopPurchaseClosed({ date: null, start_time: null }, new Date('2030-01-01T00:00:00Z'))
    ).toBe(false);
  });
});
