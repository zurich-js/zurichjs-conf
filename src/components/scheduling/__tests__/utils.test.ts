import { describe, expect, it } from 'vitest';

import { formatWorkshopAvailability } from '../utils';

describe('formatWorkshopAvailability', () => {
  it('reports sold out regardless of counts', () => {
    const result = formatWorkshopAvailability({ soldOut: true, capacity: 30, capacityRemaining: 0 });
    expect(result).toEqual({ label: 'Sold out', soldOut: true, isLow: false });
  });

  it('shows remaining seats out of total when plenty are available', () => {
    const result = formatWorkshopAvailability({ soldOut: false, capacity: 30, capacityRemaining: 18 });
    expect(result.label).toBe('18 of 30 seats left');
    expect(result.soldOut).toBe(false);
    expect(result.isLow).toBe(false);
  });

  it('flags low availability at or below the threshold', () => {
    const result = formatWorkshopAvailability({ soldOut: false, capacity: 30, capacityRemaining: 5 });
    expect(result.label).toBe('5 of 30 seats left');
    expect(result.isLow).toBe(true);
  });

  it('uses the singular form for a single remaining seat', () => {
    const result = formatWorkshopAvailability({ soldOut: false, capacity: 30, capacityRemaining: 1 });
    expect(result.label).toBe('1 of 30 seat left');
    expect(result.isLow).toBe(true);
  });

  it('omits the total when capacity is unknown', () => {
    const result = formatWorkshopAvailability({ soldOut: false, capacity: 0, capacityRemaining: 8 });
    expect(result.label).toBe('8 seats left');
  });
});
