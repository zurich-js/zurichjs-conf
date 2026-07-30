import { describe, it, expect } from 'vitest';
import { adminKeys } from '../query-keys';

describe('adminKeys', () => {
  it('roots every key under ["admin"]', () => {
    expect(adminKeys.auth()[0]).toBe('admin');
    expect(adminKeys.ticketList()[0]).toBe('admin');
    expect(adminKeys.financials()[0]).toBe('admin');
    expect(adminKeys.verificationList({ status: '' })[0]).toBe('admin');
    expect(adminKeys.workshopRegistrants('w1')[0]).toBe('admin');
    expect(adminKeys.b2bInvoiceList({ status: '', search: '' })[0]).toBe('admin');
    expect(adminKeys.vipPerkList()[0]).toBe('admin');
    expect(adminKeys.cartBuilderCatalog('CHF')[0]).toBe('admin');
  });

  it('keeps list keys under their domain key so domain invalidation matches lists', () => {
    // TanStack invalidation matches by prefix: invalidating adminKeys.tickets()
    // must cover the list and per-ticket caches.
    expect(adminKeys.ticketList().slice(0, 2)).toEqual([...adminKeys.tickets()]);
    expect(adminKeys.ticketInvoice('t1').slice(0, 2)).toEqual([...adminKeys.tickets()]);
    expect(adminKeys.verificationList({ status: 'pending' }).slice(0, 2)).toEqual([
      ...adminKeys.verifications(),
    ]);
    expect(adminKeys.workshopRegistrants('w1').slice(0, 2)).toEqual([...adminKeys.workshops()]);
    expect(adminKeys.vipPerkStats().slice(0, 2)).toEqual([...adminKeys.vipPerks()]);
    expect(adminKeys.b2bInvoice('i1').slice(0, 2)).toEqual([...adminKeys.b2b()]);
  });

  it('includes every response-affecting input in the key', () => {
    expect(adminKeys.verificationList({ status: 'pending' })).not.toEqual(
      adminKeys.verificationList({ status: 'approved' }),
    );
    expect(adminKeys.b2bInvoiceList({ status: 'paid', search: 'acme' })).not.toEqual(
      adminKeys.b2bInvoiceList({ status: 'paid', search: '' }),
    );
    expect(adminKeys.cartBuilderCatalog('CHF')).not.toEqual(adminKeys.cartBuilderCatalog('EUR'));
    expect(adminKeys.ticketInvoice('a')).not.toEqual(adminKeys.ticketInvoice('b'));
  });

  it('produces identical keys for equivalent params (stable/serializable)', () => {
    expect(adminKeys.verificationList({ status: 'pending' })).toEqual(
      adminKeys.verificationList({ status: 'pending' }),
    );
    expect(adminKeys.b2bInvoiceList({ status: '', search: 'x' })).toEqual(
      adminKeys.b2bInvoiceList({ status: '', search: 'x' }),
    );
  });
});
