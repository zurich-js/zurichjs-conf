import { describe, it, expect, vi } from 'vitest';

// The loader reaches for the service-role client and the CFP speaker list;
// only the pure verdict is under test here.
vi.mock('@/lib/supabase', () => ({ createServiceRoleClient: vi.fn() }));
vi.mock('@/lib/cfp/admin', () => ({ getAdminSpeakersWithSubmissions: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { scope: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}));

const { hoodieVerdictForTicketRow } = await import('../door-eligibility');
type Inputs = Parameters<typeof hoodieVerdictForTicketRow>[1];

const noInputs: Inputs = { upgradesById: new Map(), speakerEmails: new Set() };

function row(overrides: Partial<Parameters<typeof hoodieVerdictForTicketRow>[0]> = {}) {
  return {
    email: 'grace@example.com',
    ticket_category: 'vip',
    amount_paid: 45000,
    metadata: {},
    ...overrides,
  };
}

describe('hoodieVerdictForTicketRow', () => {
  it('reads the payment fields out of the untyped metadata', () => {
    expect(
      hoodieVerdictForTicketRow(
        row({ amount_paid: 0, metadata: { paymentType: 'complimentary' } }),
        noInputs
      )
    ).toEqual({ eligible: false, exclusion: 'complimentary_vip_ticket' });
  });

  it('resolves an upgrade through the loaded upgrade records', () => {
    const inputs: Inputs = {
      upgradesById: new Map([
        ['upg-1', { id: 'upg-1', upgrade_mode: 'complimentary', status: 'completed', admin_note: null }],
      ]),
      speakerEmails: new Set(),
    };
    expect(hoodieVerdictForTicketRow(row({ metadata: { upgrade_id: 'upg-1' } }), inputs)).toEqual({
      eligible: false,
      exclusion: 'complimentary_upgrade',
    });
  });

  it('a sponsor comp still earns one', () => {
    expect(
      hoodieVerdictForTicketRow(
        row({ amount_paid: 0, metadata: { paymentType: 'complimentary', complimentaryReason: 'sponsor' } }),
        noInputs
      )
    ).toEqual({ eligible: true, reason: 'sponsor_comp' });
  });

  it('a non-VIP speaker earns one; a non-VIP non-speaker is simply not in the running', () => {
    const inputs: Inputs = { upgradesById: new Map(), speakerEmails: new Set(['grace@example.com']) };
    expect(hoodieVerdictForTicketRow(row({ ticket_category: 'standard' }), inputs)).toEqual({
      eligible: true,
      reason: 'speaker',
    });
    expect(hoodieVerdictForTicketRow(row({ ticket_category: 'standard' }), noInputs)).toEqual({
      eligible: false,
      exclusion: null,
    });
  });

  it('tolerates non-object metadata', () => {
    expect(hoodieVerdictForTicketRow(row({ metadata: null }), noInputs)).toEqual({
      eligible: true,
      reason: 'vip_ticket_paid',
    });
  });
});
