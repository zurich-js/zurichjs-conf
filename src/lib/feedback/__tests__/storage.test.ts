import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  FEEDBACK_CLIENT_ID_KEY,
  FEEDBACK_SUBMISSIONS_KEY,
  getOrCreateFeedbackClientId,
  markFeedbackSubmitted,
  readSubmittedFeedback,
} from '../storage';

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => Array.from(map.keys())[index] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe('feedback storage', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = fakeStorage();
    vi.stubGlobal('window', { localStorage: storage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a client id once and returns the same one afterwards', () => {
    const first = getOrCreateFeedbackClientId();
    expect(first).toBeTruthy();
    expect(first!.length).toBeGreaterThanOrEqual(8);
    expect(getOrCreateFeedbackClientId()).toBe(first);
    expect(storage.getItem(FEEDBACK_CLIENT_ID_KEY)).toBe(first);
  });

  it('remembers submissions per schedule item and ignores junk', () => {
    expect(readSubmittedFeedback()).toEqual({});
    markFeedbackSubmitted('item-1', { rating: 4, comment: 'Nice', submittedAt: '2026-09-11T08:00:00.000Z' });
    storage.setItem(
      FEEDBACK_SUBMISSIONS_KEY,
      JSON.stringify({ ...readSubmittedFeedback(), broken: { nope: true } })
    );
    expect(readSubmittedFeedback()).toEqual({
      'item-1': { rating: 4, comment: 'Nice', submittedAt: '2026-09-11T08:00:00.000Z' },
    });
  });

  it('degrades to empty results when storage is unavailable', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('blocked');
      },
    });
    expect(getOrCreateFeedbackClientId()).toBeNull();
    expect(readSubmittedFeedback()).toEqual({});
  });
});
