/**
 * Tests for the discount popup show lottery.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POPUP_SHOW_PROBABILITY, rollPopupShowLottery } from '../show-lottery';

const STORAGE_KEY = 'zjs:discount:showRoll:v1';

function createLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, value),
  } satisfies Storage;
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createLocalStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POPUP_SHOW_PROBABILITY', () => {
  it('defaults to 30% of visits', () => {
    expect(POPUP_SHOW_PROBABILITY).toBe(0.3);
  });
});

describe('rollPopupShowLottery', () => {
  it('shows the popup for a roll under the probability', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.29);
    expect(rollPopupShowLottery(1)).toBe(true);
  });

  it('suppresses the popup for a roll at or above the probability', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3);
    expect(rollPopupShowLottery(1)).toBe(false);
  });

  it('lets roughly 30% of visits through over many rolls', () => {
    // Deterministic sweep across [0, 1) rather than real randomness.
    let shown = 0;
    const total = 1000;
    for (let i = 0; i < total; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(i / total);
      localStorage.removeItem(STORAGE_KEY);
      if (rollPopupShowLottery(1)) shown++;
    }
    expect(shown).toBe(Math.round(total * POPUP_SHOW_PROBABILITY));
  });

  it('reuses the same visit’s decision instead of re-rolling on reload', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    expect(rollPopupShowLottery(2)).toBe(true);

    // A losing roll would flip the answer if it were re-rolled.
    random.mockReturnValue(0.99);
    expect(rollPopupShowLottery(2)).toBe(true);
    expect(random).toHaveBeenCalledTimes(1);
  });

  it('rolls again on a new visit', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    expect(rollPopupShowLottery(2)).toBe(true);

    random.mockReturnValue(0.99);
    expect(rollPopupShowLottery(3)).toBe(false);
  });

  it('rolls fresh when the visit count is unavailable (no storage)', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    expect(rollPopupShowLottery(0)).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    random.mockReturnValue(0.99);
    expect(rollPopupShowLottery(0)).toBe(false);
  });

  it('honours an explicit probability override', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(rollPopupShowLottery(1, 0.8)).toBe(true);
    localStorage.removeItem(STORAGE_KEY);
    expect(rollPopupShowLottery(1, 0.1)).toBe(false);
  });

  it('clamps out-of-range probabilities to never / always', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(rollPopupShowLottery(1, -1)).toBe(false);
    localStorage.removeItem(STORAGE_KEY);
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    expect(rollPopupShowLottery(1, 5)).toBe(true);
  });

  it('ignores a corrupt stored record and rolls again', () => {
    localStorage.setItem(STORAGE_KEY, 'not json');
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    expect(rollPopupShowLottery(1)).toBe(true);
  });
});
