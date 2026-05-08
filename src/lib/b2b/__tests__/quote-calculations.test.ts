import { describe, it, expect } from 'vitest';
import {
  createDefaultQuoteState,
  createDefaultOption,
  computeOptionBreakdown,
  computeQuoteBreakdown,
  formatQuoteAmount,
} from '../quote-calculations';
import type { B2BQuoteOption, B2BQuoteState } from '@/lib/types/b2b-quote';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOption(overrides: Partial<B2BQuoteOption> = {}): B2BQuoteOption {
  return { ...createDefaultOption('test'), ...overrides };
}

function makeState(options: B2BQuoteOption[], currency: 'CHF' | 'EUR' = 'CHF'): B2BQuoteState {
  return { ...createDefaultQuoteState(), currency, options };
}

// ---------------------------------------------------------------------------
// createDefaultQuoteState / createDefaultOption
// ---------------------------------------------------------------------------

describe('createDefaultQuoteState', () => {
  it('returns a valid state with one empty option', () => {
    const state = createDefaultQuoteState();
    expect(state.options).toHaveLength(1);
    expect(state.currency).toBe('CHF');
    expect(state.companyName).toBe('');
  });
});

describe('createDefaultOption', () => {
  it('returns an option with zero quantities', () => {
    const opt = createDefaultOption('x');
    expect(opt.id).toBe('x');
    expect(opt.standardTickets.quantity).toBe(0);
    expect(opt.vipTickets.quantity).toBe(0);
    expect(opt.workshops).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// formatQuoteAmount
// ---------------------------------------------------------------------------

describe('formatQuoteAmount', () => {
  it('formats CHF correctly', () => {
    expect(formatQuoteAmount(29500, 'CHF')).toBe("CHF 295.00");
  });

  it('formats EUR correctly', () => {
    expect(formatQuoteAmount(42075, 'EUR')).toBe("€ 420.75");
  });

  it('formats zero', () => {
    expect(formatQuoteAmount(0, 'CHF')).toBe("CHF 0.00");
  });

  it('formats large amounts with thousands separator', () => {
    const result = formatQuoteAmount(1_000_000, 'CHF');
    // en-CH uses apostrophe as thousands separator
    expect(result).toMatch(/CHF.*10.000\.00/);
  });
});

// ---------------------------------------------------------------------------
// computeOptionBreakdown — standard tickets only
// ---------------------------------------------------------------------------

describe('computeOptionBreakdown — standard tickets only', () => {
  it('computes correct totals for 8 standard tickets at CHF 295 with 10% discount', () => {
    const opt = makeOption({
      standardTickets: { quantity: 8, unitPriceCents: 29500, discountPercent: 10 },
    });
    const bd = computeOptionBreakdown(opt);

    expect(bd.standardTickets.subtotalCents).toBe(236000); // 8 × 29500
    expect(bd.standardTickets.discountCents).toBe(23600);  // 10% of 236000
    expect(bd.standardTickets.netCents).toBe(212400);      // 236000 - 23600

    expect(bd.vipTickets.netCents).toBe(0);
    expect(bd.totalPeople).toBe(8);
    expect(bd.totalCents).toBe(212400);
    expect(bd.perPersonCents).toBe(26550); // 212400 / 8
    expect(bd.vipBenefits).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// computeOptionBreakdown — VIP tickets only
// ---------------------------------------------------------------------------

describe('computeOptionBreakdown — VIP tickets only', () => {
  it('computes correct totals for 8 VIP tickets at CHF 495 with 15% discount', () => {
    const opt = makeOption({
      vipTickets: { quantity: 8, unitPriceCents: 49500, discountPercent: 15 },
    });
    const bd = computeOptionBreakdown(opt);

    expect(bd.vipTickets.subtotalCents).toBe(396000); // 8 × 49500
    expect(bd.vipTickets.discountCents).toBe(59400);  // 15% of 396000
    expect(bd.vipTickets.netCents).toBe(336600);

    expect(bd.totalPeople).toBe(8);
    expect(bd.totalCents).toBe(336600);
    expect(bd.perPersonCents).toBe(42075); // 336600 / 8
    expect(bd.vipBenefits.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// computeOptionBreakdown — mixed tickets
// ---------------------------------------------------------------------------

describe('computeOptionBreakdown — mixed tickets', () => {
  it('computes correct totals for 6 standard + 2 VIP', () => {
    const opt = makeOption({
      standardTickets: { quantity: 6, unitPriceCents: 29500, discountPercent: 10 },
      vipTickets: { quantity: 2, unitPriceCents: 49500, discountPercent: 15 },
    });
    const bd = computeOptionBreakdown(opt);

    expect(bd.standardTickets.netCents).toBe(159300); // 6×295=1770, -10%=1593
    expect(bd.vipTickets.netCents).toBe(84150);       // 2×495=990, -15%=841.50 → 84150
    expect(bd.totalPeople).toBe(8);
    expect(bd.totalCents).toBe(159300 + 84150);
  });
});

// ---------------------------------------------------------------------------
// computeOptionBreakdown — workshops
// ---------------------------------------------------------------------------

describe('computeOptionBreakdown — workshops', () => {
  it('computes workshop totals without VIP discount', () => {
    const opt = makeOption({
      standardTickets: { quantity: 4, unitPriceCents: 29500, discountPercent: 0 },
      workshops: [{
        workshopId: 'ws1',
        title: 'React Deep Dive',
        quantity: 4,
        unitPriceCents: 25000,
        discountPercent: 0,
        linkedToVip: false,
        slug: 'react-deep-dive',
      }],
    });
    const bd = computeOptionBreakdown(opt);

    expect(bd.workshops[0].subtotalCents).toBe(100000); // 4 × 25000
    expect(bd.workshops[0].vipSavingsCents).toBe(0);
    expect(bd.workshops[0].netCents).toBe(100000);
  });

  it('applies VIP workshop discount when linkedToVip is true', () => {
    const opt = makeOption({
      vipTickets: { quantity: 3, unitPriceCents: 49500, discountPercent: 0 },
      workshops: [{
        workshopId: 'ws1',
        title: 'React Deep Dive',
        quantity: 5,
        unitPriceCents: 25000,
        discountPercent: 0,
        linkedToVip: true,
        slug: 'react-deep-dive',
      }],
    });
    const bd = computeOptionBreakdown(opt);

    // VIP savings: min(3 VIP, 5 seats) = 3 seats × 25000 × 20% = 15000
    expect(bd.workshops[0].vipSavingsCents).toBe(15000);
    expect(bd.workshops[0].netCents).toBe(125000 - 15000); // 110000
    expect(bd.totalVipWorkshopSavingsCents).toBe(15000);
  });

  it('applies both discount percent and VIP savings', () => {
    const opt = makeOption({
      vipTickets: { quantity: 4, unitPriceCents: 49500, discountPercent: 0 },
      workshops: [{
        workshopId: 'ws1',
        title: 'React Deep Dive',
        quantity: 4,
        unitPriceCents: 25000,
        discountPercent: 10,
        linkedToVip: true,
        slug: 'react-deep-dive',
      }],
    });
    const bd = computeOptionBreakdown(opt);

    expect(bd.workshops[0].subtotalCents).toBe(100000);
    expect(bd.workshops[0].discountCents).toBe(10000);  // 10% of 100000
    // VIP: min(4,4)=4 seats × 25000 × 20% = 20000
    expect(bd.workshops[0].vipSavingsCents).toBe(20000);
    expect(bd.workshops[0].netCents).toBe(70000); // 100000 - 10000 - 20000
  });
});

// ---------------------------------------------------------------------------
// computeOptionBreakdown — custom line items
// ---------------------------------------------------------------------------

describe('computeOptionBreakdown — custom line items', () => {
  it('includes custom line items in totals', () => {
    const opt = makeOption({
      standardTickets: { quantity: 2, unitPriceCents: 29500, discountPercent: 0 },
      customLineItems: [
        { id: 'c1', label: 'Branded lanyards', quantity: 10, unitPriceCents: 500 },
      ],
    });
    const bd = computeOptionBreakdown(opt);

    expect(bd.customLineItems[0].subtotalCents).toBe(5000);
    expect(bd.totalCents).toBe(59000 + 5000); // tickets + custom
  });
});

// ---------------------------------------------------------------------------
// computeOptionBreakdown — custom discounts
// ---------------------------------------------------------------------------

describe('computeOptionBreakdown — custom discounts', () => {
  it('applies fixed discount', () => {
    const opt = makeOption({
      standardTickets: { quantity: 2, unitPriceCents: 29500, discountPercent: 0 },
      customDiscounts: [
        { id: 'd1', label: 'Partner discount', type: 'fixed', value: 10000 },
      ],
    });
    const bd = computeOptionBreakdown(opt);

    expect(bd.customDiscounts[0].amountCents).toBe(10000);
    expect(bd.totalCents).toBe(59000 - 10000); // 49000
  });

  it('applies percent discount on pre-discount total', () => {
    const opt = makeOption({
      standardTickets: { quantity: 2, unitPriceCents: 29500, discountPercent: 0 },
      customDiscounts: [
        { id: 'd1', label: '5% bundle discount', type: 'percent', value: 5 },
      ],
    });
    const bd = computeOptionBreakdown(opt);

    // pre-discount total = 59000 (tickets net), 5% = 2950
    expect(bd.customDiscounts[0].amountCents).toBe(2950);
    expect(bd.totalCents).toBe(59000 - 2950);
  });

  it('clamps total to zero when discount exceeds total', () => {
    const opt = makeOption({
      standardTickets: { quantity: 1, unitPriceCents: 10000, discountPercent: 0 },
      customDiscounts: [
        { id: 'd1', label: 'Full comp', type: 'fixed', value: 50000 },
      ],
    });
    const bd = computeOptionBreakdown(opt);

    expect(bd.totalCents).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeOptionBreakdown — zero / edge cases
// ---------------------------------------------------------------------------

describe('computeOptionBreakdown — edge cases', () => {
  it('handles zero quantities gracefully', () => {
    const opt = makeOption();
    const bd = computeOptionBreakdown(opt);

    expect(bd.totalPeople).toBe(0);
    expect(bd.perPersonCents).toBe(0);
    expect(bd.totalCents).toBe(0);
    expect(bd.subtotalCents).toBe(0);
  });

  it('computes subtotalCents as sum of all raw line items', () => {
    const opt = makeOption({
      standardTickets: { quantity: 2, unitPriceCents: 10000, discountPercent: 50 },
      vipTickets: { quantity: 1, unitPriceCents: 20000, discountPercent: 0 },
      workshops: [{
        workshopId: 'ws1', title: 'WS', slug: 'ws', quantity: 1,
        unitPriceCents: 5000, discountPercent: 0, linkedToVip: false,
      }],
      customLineItems: [
        { id: 'c1', label: 'Extra', quantity: 1, unitPriceCents: 3000 },
      ],
    });
    const bd = computeOptionBreakdown(opt);

    // subtotal = raw totals before discounts: 20000 + 20000 + 5000 + 3000
    expect(bd.subtotalCents).toBe(48000);
  });
});

// ---------------------------------------------------------------------------
// computeQuoteBreakdown
// ---------------------------------------------------------------------------

describe('computeQuoteBreakdown', () => {
  it('computes multiple options and finds best value by most total savings', () => {
    const state = makeState([
      makeOption({
        id: 'a',
        title: 'Standard',
        standardTickets: { quantity: 8, unitPriceCents: 29500, discountPercent: 10 },
      }),
      makeOption({
        id: 'b',
        title: 'VIP',
        vipTickets: { quantity: 8, unitPriceCents: 49500, discountPercent: 15 },
      }),
    ]);

    const bd = computeQuoteBreakdown(state);

    expect(bd.options).toHaveLength(2);
    expect(bd.currency).toBe('CHF');

    // Standard savings: 23600 (10% of 236000)
    // VIP savings: 59400 (15% of 396000)
    expect(bd.bestValueIndex).toBe(1); // VIP has most savings
  });

  it('returns -1 for bestValueIndex when no options have savings', () => {
    const state = makeState([makeOption()]);
    const bd = computeQuoteBreakdown(state);
    expect(bd.bestValueIndex).toBe(-1);
  });

  it('handles 3 options', () => {
    const state = makeState([
      makeOption({ id: 'a', standardTickets: { quantity: 4, unitPriceCents: 29500, discountPercent: 0 } }),
      makeOption({ id: 'b', vipTickets: { quantity: 4, unitPriceCents: 49500, discountPercent: 0 } }),
      makeOption({ id: 'c', standardTickets: { quantity: 2, unitPriceCents: 29500, discountPercent: 20 }, vipTickets: { quantity: 2, unitPriceCents: 49500, discountPercent: 20 } }),
    ]);

    const bd = computeQuoteBreakdown(state);
    expect(bd.options).toHaveLength(3);

    // Option A savings: 0
    // Option B savings: 0
    // Option C savings: 20% of (2×29500) + 20% of (2×49500) = 11800 + 19800 = 31600
    expect(bd.bestValueIndex).toBe(2); // Option C has the most savings
  });
});

// ---------------------------------------------------------------------------
// Real-world scenario from requirements
// ---------------------------------------------------------------------------

describe('real-world scenario — 8-person team quote', () => {
  it('matches the example pricing from the requirements', () => {
    const state = makeState([
      makeOption({
        id: 'standard',
        title: 'Standard Package',
        standardTickets: { quantity: 8, unitPriceCents: 29500, discountPercent: 10 },
      }),
      makeOption({
        id: 'vip',
        title: 'VIP Package',
        vipTickets: { quantity: 8, unitPriceCents: 49500, discountPercent: 15 },
      }),
    ]);

    const bd = computeQuoteBreakdown(state);

    // Standard: 8 × 295 = 2360, -10% = 2124
    expect(bd.options[0].totalCents).toBe(212400);
    expect(bd.options[0].subtotalCents).toBe(236000);

    // VIP: 8 × 495 = 3960, -15% = 3366
    expect(bd.options[1].totalCents).toBe(336600);
    expect(bd.options[1].subtotalCents).toBe(396000);

    // Per-person
    expect(bd.options[0].perPersonCents).toBe(26550); // ~265.50
    expect(bd.options[1].perPersonCents).toBe(42075); // ~420.75

    // VIP benefits only on option 2
    expect(bd.options[0].vipBenefits).toHaveLength(0);
    expect(bd.options[1].vipBenefits.length).toBeGreaterThan(0);
  });

  it('computes VIP workshop savings for the team', () => {
    const opt = makeOption({
      vipTickets: { quantity: 8, unitPriceCents: 49500, discountPercent: 15 },
      workshops: [{
        workshopId: 'ws1',
        title: '4-hour Workshop',
        quantity: 8,
        unitPriceCents: 25000,
        discountPercent: 0,
        linkedToVip: true,
        slug: 'react-deep-dive',
      }],
    });
    const bd = computeOptionBreakdown(opt);

    // VIP savings: 8 seats × 25000 × 20% = 40000 (CHF 400 total, CHF 50/person)
    expect(bd.totalVipWorkshopSavingsCents).toBe(40000);
    expect(bd.workshops[0].vipSavingsCents).toBe(40000);
  });
});
