/**
 * useLocalStorage — Type-safe web-storage hook with TTL support.
 *
 * Reads on mount, writes on setter calls, and auto-expires entries after the
 * configured TTL. Keys are constrained to the LocalStorageKey union to prevent
 * typos and ensure discoverability.
 *
 * Backing store is chosen per key (see STORAGE_BACKEND): keys holding attendee
 * or billing PII use sessionStorage so the data clears when the tab closes and
 * never lingers on a shared machine; keys that must survive across sessions
 * (cart recovery) use localStorage. Choosing the store by key — not per call —
 * means two call sites for the same key can't split its data across two stores.
 */

import { useState, useCallback, useEffect } from 'react';
import type { CartStep } from '@/components/cart/types';
import type { AttendeeInfo, CheckoutFormData } from '@/lib/validations/checkout';
import type { Cart } from '@/types/cart';

/**
 * Checkout progress that used to live in component state only, so leaving the
 * cart (to read the refund policy, say) discarded every attendee field the
 * visitor had typed and dropped them back on the review step.
 */
export interface CheckoutProgress {
  attendees: AttendeeInfo[];
  workshopAttendees: Record<string, AttendeeInfo[]>;
  step: CartStep;
}

// ── Allowed keys + their value types ───────────────────────────────────────────

interface LocalStorageSchema {
  zurichjs_billing_data: Partial<CheckoutFormData>;
  zurichjs_cart_recovery: string;
  zurichjs_cart_v1: Cart;
  /** Voucher code waiting for a non-empty cart to apply itself to */
  zurichjs_pending_voucher: string;
  /** Attendee details + step so a returning visitor resumes mid-checkout */
  zurichjs_checkout_progress: CheckoutProgress;
}

export type LocalStorageKey = keyof LocalStorageSchema;

type StorageBackend = 'local' | 'session';

/**
 * Which backing store each key uses.
 *
 * - `session` — holds personal data (billing details, attendee names/emails).
 *   sessionStorage clears when the tab closes, so PII doesn't sit on a shared
 *   or kiosk browser after the visitor walks away. The in-tab "check the refund
 *   policy and come back" flow still works; only closing the tab drops it, and
 *   the abandonment email covers the come-back-later case.
 * - `local` — must survive across sessions. Cart recovery and a parked voucher
 *   are the whole point of persisting past a tab close.
 *
 * Keys not listed default to localStorage.
 */
const STORAGE_BACKEND: Partial<Record<LocalStorageKey, StorageBackend>> = {
  zurichjs_billing_data: 'session',
  zurichjs_checkout_progress: 'session',
};

function resolveStore(key: LocalStorageKey): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return STORAGE_BACKEND[key] === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    // Access to web storage can throw under strict privacy settings.
    return null;
  }
}

// ── Internal envelope ──────────────────────────────────────────────────────────

interface StoredEntry<T> {
  data: T;
  expiresAt: number;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * @param key     One of the registered storage keys
 * @param ttlMs   Time-to-live in milliseconds (default: 2 hours)
 */
export function useLocalStorage<K extends LocalStorageKey>(
  key: K,
  ttlMs: number = 2 * 60 * 60 * 1000
): [LocalStorageSchema[K] | undefined, (value: LocalStorageSchema[K]) => void, () => void] {
  type V = LocalStorageSchema[K];

  const [storedValue, setStoredValue] = useState<V | undefined>(() => {
    const store = resolveStore(key);
    if (!store) return undefined;
    try {
      const raw = store.getItem(key);
      if (!raw) return undefined;
      const entry: StoredEntry<V> = JSON.parse(raw);
      if (Date.now() > entry.expiresAt) {
        store.removeItem(key);
        return undefined;
      }
      return entry.data;
    } catch {
      return undefined;
    }
  });

  // One-time hygiene: session-backed keys previously lived in localStorage.
  // Purge any leftover copy so pre-migration PII doesn't outlive its purpose in
  // the more persistent store.
  useEffect(() => {
    if (typeof window === 'undefined' || STORAGE_BACKEND[key] !== 'session') return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  }, [key]);

  const setValue = useCallback((value: V) => {
    setStoredValue(value);
    const store = resolveStore(key);
    if (!store) return;
    try {
      const entry: StoredEntry<V> = { data: value, expiresAt: Date.now() + ttlMs };
      store.setItem(key, JSON.stringify(entry));
    } catch { /* storage full or unavailable */ }
  }, [key, ttlMs]);

  const removeValue = useCallback(() => {
    setStoredValue(undefined);
    const store = resolveStore(key);
    if (!store) return;
    try { store.removeItem(key); } catch { /* noop */ }
  }, [key]);

  return [storedValue, setValue, removeValue];
}
