/**
 * useDiscount Hook
 *
 * State machine orchestrator for the discount popup system.
 * Manages UI state, countdown, and analytics. Uses TanStack Query for status restoration.
 */

import { useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analytics } from '@/lib/analytics/client';
import { discountStatusQueryOptions } from '@/lib/queries/discount';
import type {
  DiscountState,
  DiscountData,
  DiscountAction,
} from '@/lib/discount/types';
import {
  hasDismissedCookie,
  setDismissedCookie,
  clearDiscountCookies,
} from '@/lib/discount';
import type { TimeRemaining } from './useCountdown';

interface DiscountReducerState {
  state: DiscountState;
  data: DiscountData | null;
}

function discountReducer(
  current: DiscountReducerState,
  action: DiscountAction
): DiscountReducerState {
  switch (action.type) {
    case 'START_LOADING':
      return { state: 'loading', data: null };
    case 'SHOW_MODAL':
      return { state: 'modal_open', data: action.data };
    case 'RESTORE_MINIMIZED':
      return { state: 'minimized', data: action.data };
    case 'DISMISS':
      return { ...current, state: 'minimized' };
    case 'REOPEN':
      return { ...current, state: 'modal_open' };
    case 'EXPIRE':
      return { state: 'expired', data: current.data };
    case 'ERROR':
      return { state: 'idle', data: null };
    default:
      return current;
  }
}

function calculateTimeRemaining(targetDate: string | null): TimeRemaining {
  if (!targetDate) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isComplete: true };
  }

  const now = Date.now();
  const target = new Date(targetDate).getTime();
  const total = target - now;

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isComplete: true };
  }

  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
    isComplete: false,
  };
}

// Delay before showing the discount modal on first visit (in milliseconds)
const INITIAL_POPUP_DELAY_MS = 30_000; // 30 seconds

export function useDiscount(initialDiscount?: DiscountData | null) {
  // Check if we need to restore from dismissed state (no initial discount + has dismissed cookie)
  const shouldCheckStatus = !initialDiscount && typeof window !== 'undefined' && hasDismissedCookie();

  // Use TanStack Query to fetch status when restoring minimized state
  const { data: statusData } = useQuery({
    ...discountStatusQueryOptions,
    enabled: shouldCheckStatus,
  });

  // Start in 'idle' state even with initialDiscount - we'll show after delay
  const [{ state, data }, dispatch] = useReducer(discountReducer, {
    state: 'idle',
    data: initialDiscount ?? null,
  });

  const wasCopiedRef = useRef(false);
  const hasTrackedRef = useRef(false);
  const hasRestoredRef = useRef(false);
  const hasShownInitialRef = useRef(false);

  // Countdown state - recalculates when data.expiresAt changes
  const [countdown, setCountdown] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(initialDiscount?.expiresAt ?? null)
  );

  // Show modal after delay for initial discount (first-time visitors)
  useEffect(() => {
    if (hasShownInitialRef.current) return;
    if (!initialDiscount) return;

    hasShownInitialRef.current = true;
    const timer = setTimeout(() => {
      dispatch({ type: 'SHOW_MODAL', data: initialDiscount });
    }, INITIAL_POPUP_DELAY_MS);

    return () => clearTimeout(timer);
  }, [initialDiscount]);

  // Restore minimized state when status query returns active discount
  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (statusData?.active && statusData.code && statusData.expiresAt && statusData.percentOff) {
      hasRestoredRef.current = true;
      dispatch({
        type: 'RESTORE_MINIMIZED',
        data: {
          code: statusData.code,
          expiresAt: statusData.expiresAt,
          percentOff: statusData.percentOff,
        },
      });
    }
  }, [statusData]);

  // Track analytics when modal is actually shown (after delay)
  useEffect(() => {
    if (hasTrackedRef.current) return;
    if (state === 'modal_open' && data) {
      hasTrackedRef.current = true;
      analytics.track('discount_popup_shown', {
        discount_code: data.code,
        percent_off: data.percentOff,
        expires_at: data.expiresAt,
      });
    }
  }, [state, data]);

  // Update countdown every second when we have data
  useEffect(() => {
    if (!data?.expiresAt) return;

    // Calculate immediately
    setCountdown(calculateTimeRemaining(data.expiresAt));

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(data.expiresAt);
      setCountdown(remaining);
      if (remaining.isComplete) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [data?.expiresAt]);

  // Handle expiry when countdown completes
  useEffect(() => {
    if (!data) return;
    if (countdown.isComplete && (state === 'modal_open' || state === 'minimized')) {
      dispatch({ type: 'EXPIRE' });
      analytics.track('discount_expired', {
        discount_code: data.code,
        was_copied: wasCopiedRef.current,
      });
    }
  }, [countdown.isComplete, state, data]);

  // Clean up cookies on expire
  useEffect(() => {
    if (state === 'expired') {
      clearDiscountCookies();
    }
  }, [state]);

  const dismiss = useCallback(() => {
    if (!data) return;
    setDismissedCookie();
    dispatch({ type: 'DISMISS' });
    analytics.track('discount_popup_dismissed', {
      discount_code: data.code,
      time_remaining_seconds: Math.floor(countdown.total / 1000),
    });
  }, [data, countdown.total]);

  const reopen = useCallback(() => {
    if (!data) return;
    dispatch({ type: 'REOPEN' });
    analytics.track('discount_widget_clicked', {
      discount_code: data.code,
      time_remaining_seconds: Math.floor(countdown.total / 1000),
    });
  }, [data, countdown.total]);

  const copyCode = useCallback(async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.code);
      wasCopiedRef.current = true;
      analytics.track('discount_code_copied', {
        discount_code: data.code,
        time_remaining_seconds: Math.floor(countdown.total / 1000),
      });
    } catch {
      // Clipboard API may fail in some browsers
    }
  }, [data, countdown.total]);

  return {
    state,
    discountData: data,
    countdown,
    dismiss,
    reopen,
    copyCode,
    wasCopied: wasCopiedRef.current,
  };
}
