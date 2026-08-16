/**
 * Tests for the client-readable discount dismissal cookie.
 *
 * The interesting behaviour is the dismissal lifecycle: a dismissal made while
 * the offer is live is short-lived, but one that outlives its code becomes
 * permanent so the popup never returns.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCookie,
  setCookie,
  deleteCookie,
  hasDismissedCookie,
  hasDismissedWithCode,
  hasDismissedExpiredOffer,
  setDismissedCookie,
  setExpiredDismissalCookie,
  clearDiscountCookies,
} from '../cookies';

const DISMISSED = 'discount_dismissed';

interface StoredCookie {
  value: string;
  maxAge: number;
}

const store = new Map<string, StoredCookie>();

/** Minimal document.cookie stand-in: parses the set string, honours max-age=0. */
function stubDocumentCookie(): void {
  vi.stubGlobal('document', {
    get cookie(): string {
      return [...store.entries()].map(([name, { value }]) => `${name}=${value}`).join('; ');
    },
    set cookie(input: string) {
      const [pair, ...attrs] = input.split('; ');
      const separator = pair.indexOf('=');
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      const maxAgeAttr = attrs.find((attr) => attr.toLowerCase().startsWith('max-age='));
      const maxAge = maxAgeAttr ? parseInt(maxAgeAttr.split('=')[1], 10) : -1;
      if (maxAge === 0) {
        store.delete(name);
        return;
      }
      store.set(name, { value, maxAge });
    },
  });
}

beforeEach(() => {
  store.clear();
  stubDocumentCookie();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cookie primitives', () => {
  it('round-trips a value', () => {
    setCookie('foo', 'bar baz', 60);
    expect(getCookie('foo')).toBe('bar baz');
  });

  it('returns null for a missing cookie', () => {
    expect(getCookie('nope')).toBeNull();
  });

  it('deletes a cookie', () => {
    setCookie('foo', 'bar', 60);
    deleteCookie('foo');
    expect(getCookie('foo')).toBeNull();
  });
});

describe('setDismissedCookie', () => {
  it('records a gate dismissal (no code yet) with the short window', () => {
    setDismissedCookie(false);
    expect(hasDismissedCookie()).toBe(true);
    expect(hasDismissedWithCode()).toBe(false);
    expect(hasDismissedExpiredOffer()).toBe(false);
    expect(store.get(DISMISSED)?.maxAge).toBe(24 * 3600);
  });

  it('records a dismissal made while holding a live code', () => {
    setDismissedCookie(true);
    expect(hasDismissedCookie()).toBe(true);
    expect(hasDismissedWithCode()).toBe(true);
    expect(store.get(DISMISSED)?.maxAge).toBe(24 * 3600);
  });

  it('treats a legacy "1" dismissal as dismissed but not code-bound', () => {
    setCookie(DISMISSED, '1', 24 * 3600);
    expect(hasDismissedCookie()).toBe(true);
    expect(hasDismissedWithCode()).toBe(false);
  });
});

describe('setExpiredDismissalCookie', () => {
  it('suppresses the popup far beyond the offer window', () => {
    setDismissedCookie(true);
    setExpiredDismissalCookie();

    expect(hasDismissedCookie()).toBe(true);
    expect(hasDismissedExpiredOffer()).toBe(true);
    expect(hasDismissedWithCode()).toBe(false);
    expect(store.get(DISMISSED)?.maxAge).toBe(365 * 24 * 3600);
  });

  it('keeps suppressing after a clear-free reload', () => {
    setExpiredDismissalCookie();
    expect(hasDismissedCookie()).toBe(true);
  });
});

describe('clearDiscountCookies', () => {
  it('lets the popup run again when the offer lapsed undismissed', () => {
    clearDiscountCookies();
    expect(hasDismissedCookie()).toBe(false);
    expect(hasDismissedExpiredOffer()).toBe(false);
  });
});

describe('no document (SSR)', () => {
  it('reports no dismissal instead of throwing', () => {
    vi.stubGlobal('document', undefined);
    expect(hasDismissedCookie()).toBe(false);
    expect(() => setDismissedCookie(true)).not.toThrow();
    expect(() => setExpiredDismissalCookie()).not.toThrow();
  });
});
