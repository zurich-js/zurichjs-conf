/**
 * useDiscount Hook
 *
 * State machine orchestrator for the discount popup system.
 * Manages UI state, countdown, and analytics. Uses TanStack Query for status restoration.
 */

import { useReducer, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCopyToClipboard, useTimeout } from 'usehooks-ts';
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
import { useCountdown, type TimeRemaining } from './useCountdown';

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

// Delay before showing the discount modal on first visit
const INITIAL_POPUP_DELAY_MS = 30_000; // 30 seconds

// Default expiry date far in the future (used when no data yet)
const DEFAULT_EXPIRY = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

export function useDiscount(initialDiscount?: DiscountData | null) {
  // Check if we need to restore from dismissed state
  const shouldCheckStatus = !initialDiscount && typeof window !== 'undefined' && hasDismissedCookie();

  // Fetch status when restoring minimized state
  const { data: statusData } = useQuery({
    ...discountStatusQueryOptions,
    enabled: shouldCheckStatus,
  });

  // State machine
  const [{ state, data }, dispatch] = useReducer(discountReducer, {
    state: 'idle',
    data: initialDiscount ?? null,
  });

  // Track one-time events
  const trackedRef = useRef({ shown: false, restored: false, copied: false });

  // Clipboard hook from usehooks-ts
  const [, copyToClipboard] = useCopyToClipboard();

  // Countdown using existing hook - use data's expiry or a far-future default
  const countdown = useCountdown(data?.expiresAt ?? DEFAULT_EXPIRY);

  // Show modal after delay for first-time visitors
  useTimeout(
    () => {
      if (initialDiscount) {
        dispatch({ type: 'SHOW_MODAL', data: initialDiscount });
      }
    },
    initialDiscount && state === 'idle' ? INITIAL_POPUP_DELAY_MS : null
  );

  // Restore minimized state from status query
  useEffect(() => {
    if (trackedRef.current.restored) return;
    if (statusData?.active && statusData.code && statusData.expiresAt && statusData.percentOff) {
      trackedRef.current.restored = true;
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

  // Track analytics when modal is shown
  useEffect(() => {
    if (trackedRef.current.shown) return;
    if (state === 'modal_open' && data) {
      trackedRef.current.shown = true;
      analytics.track('discount_popup_shown', {
        discount_code: data.code,
        percent_off: data.percentOff,
        expires_at: data.expiresAt,
      });
    }
  }, [state, data]);

  // Handle expiry
  useEffect(() => {
    if (!data) return;
    if (countdown.isComplete && (state === 'modal_open' || state === 'minimized')) {
      dispatch({ type: 'EXPIRE' });
      analytics.track('discount_expired', {
        discount_code: data.code,
        was_copied: trackedRef.current.copied,
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
    const success = await copyToClipboard(data.code);
    if (success) {
      trackedRef.current.copied = true;
      analytics.track('discount_code_copied', {
        discount_code: data.code,
        time_remaining_seconds: Math.floor(countdown.total / 1000),
      });
    }
  }, [data, countdown.total, copyToClipboard]);

  // Compute the correct countdown to return
  // Only show real countdown when we have actual data with expiry
  const effectiveCountdown: TimeRemaining = data?.expiresAt
    ? countdown
    : { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isComplete: false };

  return {
    state,
    discountData: data,
    countdown: effectiveCountdown,
    dismiss,
    reopen,
    copyCode,
    wasCopied: trackedRef.current.copied,
  };
}
