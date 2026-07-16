/**
 * Tests for the localStorage visit tracker.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { recordVisit, getVisitCount, VISIT_SESSION_GAP_MS } from '../visit-tracker';

const BASE = 1_750_000_000_000; // fixed epoch ms so tests don't rely on Date.now()

function stubLocalStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  });
}

beforeEach(() => {
  stubLocalStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('recordVisit', () => {
  it('counts the first visit', () => {
    expect(recordVisit(BASE)).toBe(1);
    expect(getVisitCount()).toBe(1);
  });

  it('does not double-count loads within the same session window', () => {
    recordVisit(BASE);
    expect(recordVisit(BASE + 5 * 60 * 1000)).toBe(1);
    expect(getVisitCount()).toBe(1);
  });

  it('extends the session window on activity (rolling gap)', () => {
    recordVisit(BASE);
    // 20 min later — same session, refreshes lastVisitAt
    recordVisit(BASE + 20 * 60 * 1000);
    // 20 more min — still within the gap from the refreshed timestamp
    expect(recordVisit(BASE + 40 * 60 * 1000)).toBe(1);
  });

  it('counts a new visit after the session gap', () => {
    recordVisit(BASE);
    expect(recordVisit(BASE + VISIT_SESSION_GAP_MS + 1)).toBe(2);
  });

  it('reaches the recurring threshold over three separated visits', () => {
    recordVisit(BASE);
    recordVisit(BASE + VISIT_SESSION_GAP_MS + 1);
    expect(recordVisit(BASE + 2 * (VISIT_SESSION_GAP_MS + 1))).toBe(3);
  });

  it('recovers from corrupted storage', () => {
    localStorage.setItem('zjs:discount:visits:v1', 'not-json');
    expect(recordVisit(BASE)).toBe(1);

    localStorage.setItem('zjs:discount:visits:v1', JSON.stringify({ nope: true }));
    expect(recordVisit(BASE)).toBe(1);
  });

  it('returns 0 when localStorage is unavailable', () => {
    vi.unstubAllGlobals();
    // Node test env has no localStorage global by default
    expect(recordVisit(BASE)).toBe(0);
    expect(getVisitCount()).toBe(0);
  });
});
