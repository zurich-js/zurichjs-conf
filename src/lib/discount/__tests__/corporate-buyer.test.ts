/**
 * Tests for the corporate-buyer marker, focused on the handoff from
 * /corporate/<code> — the redirect can only leave a cookie behind, so if this
 * promotion breaks the discount popup starts offering money off to exactly the
 * buyers the link was meant to exclude.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const getCookie = vi.fn<(name: string) => string | null>();
const deleteCookie = vi.fn();

vi.mock('../cookies', () => ({
  getCookie: (name: string) => getCookie(name),
  deleteCookie: (name: string) => deleteCookie(name),
}));

vi.mock('posthog-js', () => ({
  default: { get_distinct_id: () => 'ph-1', people: { set: vi.fn() } },
}));

const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

const { claimCorporateHandoff, isCorporateBuyer, clearCorporateBuyer } = await import(
  '../corporate-buyer'
);

describe('corporate handoff', () => {
  beforeEach(() => {
    store.clear();
    getCookie.mockReset().mockReturnValue(null);
    deleteCookie.mockReset();
  });

  it('promotes the handoff cookie into the durable marker and clears it', () => {
    getCookie.mockReturnValue('Acme AG');

    claimCorporateHandoff();

    expect(deleteCookie).toHaveBeenCalledWith('corporate_handoff');
    expect(isCorporateBuyer()).toBe(true);
  });

  it('marks the browser on the eligibility check itself', () => {
    // The popup's check can run before the app shell's effect, so it must not
    // depend on someone else having promoted the cookie first.
    getCookie.mockReturnValue('Acme AG');

    expect(isCorporateBuyer()).toBe(true);
  });

  it('is idempotent — a second claim finds nothing and changes nothing', () => {
    getCookie.mockReturnValueOnce('Acme AG');

    claimCorporateHandoff();
    claimCorporateHandoff();

    expect(deleteCookie).toHaveBeenCalledTimes(1);
    expect(isCorporateBuyer()).toBe(true);
  });

  it('leaves an unmarked browser alone when there is no cookie', () => {
    expect(isCorporateBuyer()).toBe(false);
    expect(deleteCookie).not.toHaveBeenCalled();
  });

  it('clears the marker on request', () => {
    getCookie.mockReturnValueOnce('Acme AG');
    claimCorporateHandoff();

    clearCorporateBuyer();

    expect(isCorporateBuyer()).toBe(false);
  });
});
