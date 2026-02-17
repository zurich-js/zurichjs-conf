/**
 * Unit Tests for Workshop Booking Validation
 */

import { describe, it, expect } from 'vitest';
import {
  hasTimeSlotConflict,
  findConflictingWorkshop,
  canBookWorkshop,
  validateWorkshopSelection,
  calculateWorkshopTotal,
} from '../validation';

describe('hasTimeSlotConflict', () => {
  it('returns true for same slot', () => {
    expect(hasTimeSlotConflict('morning', 'morning')).toBe(true);
    expect(hasTimeSlotConflict('afternoon', 'afternoon')).toBe(true);
  });

  it('returns false for different non-overlapping slots', () => {
    expect(hasTimeSlotConflict('morning', 'afternoon')).toBe(false);
    expect(hasTimeSlotConflict('afternoon', 'morning')).toBe(false);
  });

  it('returns true when either slot is full_day', () => {
    expect(hasTimeSlotConflict('full_day', 'morning')).toBe(true);
    expect(hasTimeSlotConflict('full_day', 'afternoon')).toBe(true);
    expect(hasTimeSlotConflict('morning', 'full_day')).toBe(true);
    expect(hasTimeSlotConflict('afternoon', 'full_day')).toBe(true);
    expect(hasTimeSlotConflict('full_day', 'full_day')).toBe(true);
  });
});

describe('findConflictingWorkshop', () => {
  const existingBookings = [
    { id: '1', time_slot: 'morning' as const, title: 'React Workshop' },
    { id: '2', time_slot: 'afternoon' as const, title: 'Node Workshop' },
  ];

  it('returns null when no conflict', () => {
    const result = findConflictingWorkshop(
      { id: '3', time_slot: 'afternoon' },
      [existingBookings[0]],
    );
    expect(result).toBeNull();
  });

  it('returns conflicting workshop when slot conflicts', () => {
    const result = findConflictingWorkshop(
      { id: '3', time_slot: 'morning' },
      existingBookings,
    );
    expect(result).toEqual({ id: '1', title: 'React Workshop' });
  });

  it('ignores self (same id)', () => {
    const result = findConflictingWorkshop(
      { id: '1', time_slot: 'morning' },
      existingBookings,
    );
    expect(result).toBeNull();
  });

  it('detects full_day conflicts', () => {
    const result = findConflictingWorkshop(
      { id: '3', time_slot: 'full_day' },
      existingBookings,
    );
    expect(result).toEqual({ id: '1', title: 'React Workshop' });
  });
});

describe('canBookWorkshop', () => {
  it('allows booking when seats are available', () => {
    const result = canBookWorkshop({ capacity: 30, enrolled_count: 15 });
    expect(result.allowed).toBe(true);
  });

  it('rejects booking when sold out', () => {
    const result = canBookWorkshop({ capacity: 30, enrolled_count: 30 });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('sold out');
  });

  it('rejects booking when oversold', () => {
    const result = canBookWorkshop({ capacity: 30, enrolled_count: 31 });
    expect(result.allowed).toBe(false);
  });

  it('rejects booking when workshop is not published', () => {
    const result = canBookWorkshop({ capacity: 30, enrolled_count: 0, status: 'draft' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not available');
  });

  it('allows booking when status is published', () => {
    const result = canBookWorkshop({ capacity: 30, enrolled_count: 0, status: 'published' });
    expect(result.allowed).toBe(true);
  });
});

describe('validateWorkshopSelection', () => {
  const makeWorkshop = (overrides = {}) => ({
    id: '1',
    title: 'Workshop',
    time_slot: 'morning' as const,
    capacity: 30,
    seats_remaining: 15,
    is_sold_out: false,
    ...overrides,
  });

  it('validates a single available workshop', () => {
    const result = validateWorkshopSelection([makeWorkshop()]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates two non-conflicting workshops', () => {
    const result = validateWorkshopSelection([
      makeWorkshop({ id: '1', time_slot: 'morning' }),
      makeWorkshop({ id: '2', time_slot: 'afternoon', title: 'Workshop 2' }),
    ]);
    expect(result.valid).toBe(true);
  });

  it('rejects two workshops in the same slot', () => {
    const result = validateWorkshopSelection([
      makeWorkshop({ id: '1', time_slot: 'morning', title: 'A' }),
      makeWorkshop({ id: '2', time_slot: 'morning', title: 'B' }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('time conflict');
  });

  it('rejects sold out workshops', () => {
    const result = validateWorkshopSelection([
      makeWorkshop({ is_sold_out: true, title: 'Sold Out One' }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('sold out');
  });

  it('collects multiple errors', () => {
    const result = validateWorkshopSelection([
      makeWorkshop({ id: '1', time_slot: 'morning', title: 'A', is_sold_out: true }),
      makeWorkshop({ id: '2', time_slot: 'morning', title: 'B' }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('calculateWorkshopTotal', () => {
  it('calculates workshop-only total', () => {
    const result = calculateWorkshopTotal([15000, 20000], null, 10);
    expect(result.workshopSubtotal).toBe(35000);
    expect(result.ticketPrice).toBe(0);
    expect(result.discountAmount).toBe(0);
    expect(result.total).toBe(35000);
    expect(result.isCombo).toBe(false);
  });

  it('calculates combo total with 10% discount', () => {
    const result = calculateWorkshopTotal([15000], 20000, 10);
    expect(result.workshopSubtotal).toBe(15000);
    expect(result.ticketPrice).toBe(20000);
    expect(result.discountAmount).toBe(3500); // 10% of 35000
    expect(result.total).toBe(31500);
    expect(result.isCombo).toBe(true);
  });

  it('handles free ticket (no combo discount)', () => {
    const result = calculateWorkshopTotal([15000], 0, 10);
    expect(result.isCombo).toBe(false);
    expect(result.discountAmount).toBe(0);
  });

  it('handles single workshop', () => {
    const result = calculateWorkshopTotal([10000], null, 10);
    expect(result.total).toBe(10000);
  });

  it('handles multiple workshops with combo', () => {
    const result = calculateWorkshopTotal([10000, 10000], 25000, 10);
    // 10000 + 10000 + 25000 = 45000, 10% = 4500
    expect(result.total).toBe(40500);
  });
});
