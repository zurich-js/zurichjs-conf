import { describe, it, expect } from 'vitest';
import { isComplimentaryTicket } from '../ticket-utils';

describe('isComplimentaryTicket', () => {
  it('matches tickets flagged as complimentary in metadata', () => {
    expect(isComplimentaryTicket({ amount_paid: 5000, metadata: { paymentType: 'complimentary' } })).toBe(true);
  });

  it('matches zero-amount tickets without the metadata flag', () => {
    expect(isComplimentaryTicket({ amount_paid: 0, metadata: { paymentType: 'stripe' } })).toBe(true);
    expect(isComplimentaryTicket({ amount_paid: 0, metadata: {} })).toBe(true);
    expect(isComplimentaryTicket({ amount_paid: 0 })).toBe(true);
  });

  it('does not match paid tickets', () => {
    expect(isComplimentaryTicket({ amount_paid: 5000, metadata: { paymentType: 'stripe' } })).toBe(false);
    expect(isComplimentaryTicket({ amount_paid: 5000, metadata: { paymentType: 'bank_transfer' } })).toBe(false);
    expect(isComplimentaryTicket({ amount_paid: 5000, metadata: {} })).toBe(false);
    expect(isComplimentaryTicket({ amount_paid: 5000 })).toBe(false);
  });
});
