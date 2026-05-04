import { describe, expect, it } from 'vitest';
import type { Workshop } from '@/lib/types/database';
import { computeFullReadiness, computeStaticReadiness } from '../readiness';

function makeWorkshop(overrides: Partial<Workshop> = {}): Workshop {
  return {
    id: 'workshop-1',
    title: 'Test Workshop',
    description: 'desc',
    instructor_id: null,
    cfp_submission_id: 'cfp-1',
    room: null,
    duration_minutes: null,
    stripe_product_id: null,
    stripe_price_lookup_key: null,
    date: null,
    start_time: null,
    end_time: null,
    capacity: 0,
    enrolled_count: 0,
    price: null,
    currency: 'CHF',
    status: 'draft',
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('computeStaticReadiness', () => {
  it('marks all checks as false for an empty offering', () => {
    const items = computeStaticReadiness({ offering: makeWorkshop() });
    expect(items.every((i) => !i.ok)).toBe(true);
  });

  it('passes date/start/end/room/capacity when filled', () => {
    const items = computeStaticReadiness({
      offering: makeWorkshop({
        date: '2026-09-10',
        start_time: '09:00:00',
        end_time: '12:00:00',
        room: 'Aula 1',
        capacity: 20,
        stripe_product_id: 'prod_1',
        stripe_price_lookup_key: 'workshop_foo',
      }),
    });
    expect(items.every((i) => i.ok)).toBe(true);
  });

  it('flags endTime when end <= start', () => {
    const items = computeStaticReadiness({
      offering: makeWorkshop({
        start_time: '10:00',
        end_time: '09:00',
      }),
    });
    const end = items.find((i) => i.key === 'endTime');
    expect(end?.ok).toBe(false);
    expect(end?.hint).toContain('End must be after start');
  });

  it('uses draft overrides over offering', () => {
    const items = computeStaticReadiness({
      offering: makeWorkshop({ room: null }),
      draft: { room: 'Room A' },
    });
    const room = items.find((i) => i.key === 'room');
    expect(room?.ok).toBe(true);
  });
});

describe('computeFullReadiness', () => {
  it('is not ready when Stripe has not been validated', () => {
    const result = computeFullReadiness({
      offering: makeWorkshop({
        date: '2026-09-10',
        start_time: '09:00',
        end_time: '12:00',
        room: 'Aula 1',
        capacity: 20,
        stripe_product_id: 'prod_1',
        stripe_price_lookup_key: 'workshop_foo',
      }),
    });
    expect(result.isReady).toBe(false);
    expect(result.openItems).toBe(1);
    expect(result.items.find((i) => i.key === 'stripeValidated')?.ok).toBe(false);
  });

  it('is ready when every field set + Stripe validated', () => {
    const result = computeFullReadiness({
      offering: makeWorkshop({
        date: '2026-09-10',
        start_time: '09:00',
        end_time: '12:00',
        room: 'Aula 1',
        capacity: 20,
        stripe_product_id: 'prod_1',
        stripe_price_lookup_key: 'workshop_foo',
      }),
      validation: { valid: true, results: [] },
    });
    expect(result.isReady).toBe(true);
    expect(result.openItems).toBe(0);
  });

  it('includes all required currencies in the validation label', () => {
    const result = computeFullReadiness({ offering: makeWorkshop() });
    const stripeItem = result.items.find((i) => i.key === 'stripeValidated');
    expect(stripeItem?.label).toContain('USD');
    expect(stripeItem?.label).toContain('CHF');
    expect(stripeItem?.label).toContain('EUR');
    expect(stripeItem?.label).toContain('GBP');
  });

  it('is not ready when validation has run but failed', () => {
    const result = computeFullReadiness({
      offering: makeWorkshop({
        date: '2026-09-10',
        start_time: '09:00',
        end_time: '12:00',
        room: 'Aula 1',
        capacity: 20,
        stripe_product_id: 'prod_1',
        stripe_price_lookup_key: 'workshop_foo',
      }),
      validation: { valid: false, results: [] },
    });
    expect(result.isReady).toBe(false);
    expect(result.items.find((i) => i.key === 'stripeValidated')?.ok).toBe(false);
  });
});
