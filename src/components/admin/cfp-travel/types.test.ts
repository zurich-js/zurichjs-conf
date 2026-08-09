import { describe, expect, it } from 'vitest';
import {
  deriveTravelWindowFromFlights,
  formatExpenseTotals,
} from './types';
import type { CfpSpeakerReimbursement } from '@/lib/types/cfp';

describe('travel operations formatting', () => {
  it('uses the earliest inbound arrival and latest outbound departure', () => {
    const window = deriveTravelWindowFromFlights([
      { direction: 'inbound', arrival_time: '2026-09-10T16:00:00Z', departure_time: null },
      { direction: 'outbound', arrival_time: null, departure_time: '2026-09-12T08:00:00Z' },
      { direction: 'inbound', arrival_time: '2026-09-09T18:00:00Z', departure_time: null },
      { direction: 'outbound', arrival_time: null, departure_time: '2026-09-13T09:00:00Z' },
    ]);

    expect(window).toEqual({
      arrival: '2026-09-09T18:00:00Z',
      departure: '2026-09-13T09:00:00Z',
    });
  });

  it('groups active invoice totals by currency and excludes rejected invoices', () => {
    const reimbursements = [
      { amount: 12500, currency: 'CHF', status: 'pending' },
      { amount: 2500, currency: 'CHF', status: 'paid' },
      { amount: 9900, currency: 'EUR', status: 'approved' },
      { amount: 5000, currency: 'CHF', status: 'rejected' },
    ] as CfpSpeakerReimbursement[];

    expect(formatExpenseTotals(reimbursements)).toBe('CHF 150.00 + EUR 99.00');
  });
});
