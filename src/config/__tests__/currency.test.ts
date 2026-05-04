import { describe, expect, it } from 'vitest';
import {
  buildRequiredLookupKeys,
  REQUIRED_STRIPE_CURRENCIES,
  REQUIRED_CURRENCIES_LABEL,
  NON_BASE_SUFFIXES_LABEL,
  BASE_CURRENCY,
} from '../currency';

describe('buildRequiredLookupKeys', () => {
  it('returns one key per required currency', () => {
    const keys = buildRequiredLookupKeys('workshop_foo');
    expect(keys).toHaveLength(REQUIRED_STRIPE_CURRENCIES.length);
  });

  it('base key has no suffix (CHF)', () => {
    const keys = buildRequiredLookupKeys('workshop_foo');
    expect(keys[0]).toBe('workshop_foo');
  });

  it('appends lowercase suffixes for non-base currencies', () => {
    const keys = buildRequiredLookupKeys('workshop_foo');
    expect(keys).toContain('workshop_foo_eur');
    expect(keys).toContain('workshop_foo_gbp');
    expect(keys).toContain('workshop_foo_usd');
  });
});

describe('REQUIRED_CURRENCIES_LABEL', () => {
  it('includes all required currencies', () => {
    for (const currency of REQUIRED_STRIPE_CURRENCIES) {
      expect(REQUIRED_CURRENCIES_LABEL).toContain(currency);
    }
  });
});

describe('NON_BASE_SUFFIXES_LABEL', () => {
  it('does not include the base currency suffix', () => {
    expect(NON_BASE_SUFFIXES_LABEL).not.toContain(`_${BASE_CURRENCY.toLowerCase()}`);
  });

  it('includes suffixes for all non-base currencies', () => {
    for (const currency of REQUIRED_STRIPE_CURRENCIES) {
      if (currency === BASE_CURRENCY) continue;
      expect(NON_BASE_SUFFIXES_LABEL).toContain(`_${currency.toLowerCase()}`);
    }
  });
});
