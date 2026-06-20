/**
 * useReferralCode Hook
 *
 * Reads the ?ref= query parameter from the URL, persists it to localStorage,
 * and fires a PostHog event on first detection.
 * The stored code is passed through to the checkout session.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';

const STORAGE_KEY = 'zurichjs_referral_code';

export function useReferralCode(): string | null {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    // Try to read from URL first
    const refParam = router.query.ref;
    if (typeof refParam === 'string' && refParam.startsWith('REF-')) {
      try {
        localStorage.setItem(STORAGE_KEY, refParam);
      } catch {
        // localStorage unavailable
      }
      setCode(refParam);

      analytics.track('referral_link_clicked', {
        referral_code: refParam,
        landing_page: router.pathname,
      } as EventProperties<'referral_link_clicked'>);

      return;
    }

    // Fall back to localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCode(stored);
      }
    } catch {
      // localStorage unavailable
    }
  }, [router.query.ref, router.pathname]);

  return code;
}

/**
 * Get the stored referral code (non-hook, for use in callbacks)
 */
export function getStoredReferralCode(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
