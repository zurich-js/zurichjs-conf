import { describe, expect, it } from 'vitest';

import { formatWorkshopAvailability } from '../utils';

describe('formatWorkshopAvailability', () => {
  it('reports sold out regardless of counts', () => {
    const result = formatWorkshopAvailability({ soldOut: true, capacity: 30, capacityRemaining: 0 });
    expect(result).toEqual({ label: 'Sold out', soldOut: true, isLow: false, tone: 'red' });
  });

  it('shows only the remaining seats in green when more than half are available', () => {
    const result = formatWorkshopAvailability({ soldOut: false, capacity: 30, capacityRemaining: 18 });
    expect(result.label).toBe('18 seats left');
    expect(result.soldOut).toBe(false);
    expect(result.isLow).toBe(false);
    expect(result.tone).toBe('green');
  });

  it('uses red below 20% capacity remaining', () => {
    const result = formatWorkshopAvailability({ soldOut: false, capacity: 30, capacityRemaining: 5 });
    expect(result.label).toBe('5 seats left');
    expect(result.isLow).toBe(true);
    expect(result.tone).toBe('red');
  });

  it('uses orange from 20% up to 50% capacity remaining', () => {
    expect(formatWorkshopAvailability({ soldOut: false, capacity: 40, capacityRemaining: 8 }).tone).toBe('orange');
    expect(formatWorkshopAvailability({ soldOut: false, capacity: 40, capacityRemaining: 19 }).tone).toBe('orange');
  });

  it('uses green at 50% capacity remaining', () => {
    expect(formatWorkshopAvailability({ soldOut: false, capacity: 40, capacityRemaining: 20 }).tone).toBe('green');
  });

  it('uses the singular form for a single remaining seat', () => {
    const result = formatWorkshopAvailability({ soldOut: false, capacity: 30, capacityRemaining: 1 });
    expect(result.label).toBe('1 seat left');
    expect(result.isLow).toBe(true);
  });

  it('omits the total when capacity is unknown', () => {
    const result = formatWorkshopAvailability({ soldOut: false, capacity: 0, capacityRemaining: 8 });
    expect(result.label).toBe('8 seats left');
  });
});
