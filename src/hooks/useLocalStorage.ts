/**
 * useLocalStorage — Type-safe localStorage hook with TTL support.
 *
 * Reads from localStorage on mount, writes on setter calls.
 * Automatically expires entries after the configured TTL.
 *
 * Keys are constrained to the LocalStorageKey union to prevent typos
 * and ensure discoverability.
 */

import { useState, useCallback } from 'react';
import type { CheckoutFormData } from '@/lib/validations/checkout';

// ── Allowed keys + their value types ───────────────────────────────────────────

interface LocalStorageSchema {
  zurichjs_billing_data: Partial<CheckoutFormData>;
  zurichjs_cart_recovery: string;
}

export type LocalStorageKey = keyof LocalStorageSchema;

// ── Internal envelope ──────────────────────────────────────────────────────────

interface StoredEntry<T> {
  data: T;
  expiresAt: number;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * @param key     One of the registered localStorage keys
 * @param ttlMs   Time-to-live in milliseconds (default: 2 hours)
 */
export function useLocalStorage<K extends LocalStorageKey>(
  key: K,
  ttlMs: number = 2 * 60 * 60 * 1000
): [LocalStorageSchema[K] | undefined, (value: LocalStorageSchema[K]) => void, () => void] {
  type V = LocalStorageSchema[K];

  const [storedValue, setStoredValue] = useState<V | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return undefined;
      const entry: StoredEntry<V> = JSON.parse(raw);
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(key);
        return undefined;
      }
      return entry.data;
    } catch {
      return undefined;
    }
  });

  const setValue = useCallback((value: V) => {
    setStoredValue(value);
    try {
      const entry: StoredEntry<V> = { data: value, expiresAt: Date.now() + ttlMs };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch { /* storage full or unavailable */ }
  }, [key, ttlMs]);

  const removeValue = useCallback(() => {
    setStoredValue(undefined);
    try { localStorage.removeItem(key); } catch { /* noop */ }
  }, [key]);

  return [storedValue, setValue, removeValue];
}
