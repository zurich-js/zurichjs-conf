/**
 * useDiscount Hook
 *
 * Manages the discount popup lifecycle entirely client-side.
 * Uses TanStack Query for API calls and usehooks-ts for utilities.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useCopyToClipboard, useTimeout, useIsClient } from 'usehooks-ts';
import { analytics } from '@/lib/analytics/client';
import { discountStatusQueryOptions } from '@/lib/queries/discount';
import { getClientConfig } from '@/lib/discount/config';
import type { DiscountState, DiscountData } from '@/lib/discount/types';
import {
  hasCooldownCookie,
  hasDismissedCookie,
  setCooldownCookie,
  setDismissedCookie,
  clearDiscountCookies,
} from '@/lib/discount';
import {
  evaluateUtmLottery,
  parseUtmParams,
  type LotteryResult,
} from '@/lib/discount/utm-lottery';
import { useCountdown, type TimeRemaining } from './useCountdown';

// Constants
const POPUP_DELAY_MS = 15_000; // 15 seconds
const COOLDOWN_HOURS = 24;
const EMPTY_COUNTDOWN: TimeRemaining = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  total: 0,
  isComplete: false,
};

// API call
async function generateDiscount(lotteryPercentOff?: number): Promise<DiscountData> {
  const body = lotteryPercentOff ? JSON.stringify({ percentOff: lotteryPercentOff }) : undefined;
  const res = await fetch('/api/discount/generate', {
    method: 'POST',
    headers: lotteryPercentOff ? { 'Content-Type': 'application/json' } : undefined,
    body,
  });
  if (!res.ok) throw new Error('Failed to generate discount');
  return res.json();
}

export function useDiscount() {
  const isClient = useIsClient();
  const config = getClientConfig();

  // Core state
  const [state, setState] = useState<DiscountState>('idle');
  const [data, setData] = useState<DiscountData | null>(null);

  // One-time flags
  const flags = useRef({ shown: false, copied: false, eligibilityChecked: false });
  const isEligible = useRef(false);
  const lotteryResult = useRef<LotteryResult | null>(null);
  const [isLotteryReady, setIsLotteryReady] = useState(false);

  // Clipboard
  const [, copyToClipboard] = useCopyToClipboard();

  // Check for existing discount
  const { data: statusData, isLoading } = useQuery({
    ...discountStatusQueryOptions,
    enabled: isClient,
  });

  // Generate discount mutation
  const { mutate, isPending } = useMutation({
    mutationFn: generateDiscount,
    onSuccess: (discount) => {
      setData(discount);
      setState('modal_open');
    },
    onError: () => setState('idle'),
  });

  // Countdown - use a far future date as fallback to avoid hydration issues
  const fallbackExpiry = useRef(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString());
  const countdown = useCountdown(data?.expiresAt ?? fallbackExpiry.current);

  // Determine eligibility once on mount
  useEffect(() => {
    if (!isClient || flags.current.eligibilityChecked) return;
    flags.current.eligibilityChecked = true;

    // Check UTM lottery first (overrides normal flow)
    const utmParams = parseUtmParams(window.location.search);
    const lottery = evaluateUtmLottery(utmParams);

    if (lottery.eligible) {
      isEligible.current = true;
      lotteryResult.current = lottery;
      setIsLotteryReady(true); // Trigger immediate display
      return;
    }

    if (config.forceShow) {
      isEligible.current = true;
      return;
    }

    if (hasCooldownCookie()) {
      isEligible.current = false;
      return;
    }

    isEligible.current = Math.random() < config.showProbability;

    if (!isEligible.current) {
      setCooldownCookie(COOLDOWN_HOURS);
    }
  }, [isClient, config.forceShow, config.showProbability]);

  // Restore minimized state from existing discount
  useEffect(() => {
    if (!statusData?.active || !statusData.code || data) return;

    setData({
      code: statusData.code,
      expiresAt: statusData.expiresAt!,
      percentOff: statusData.percentOff!,
    });
    setState('minimized');
  }, [statusData, data]);

  // Show popup after delay if eligible (lottery shows immediately, normal has 15s delay)
  const shouldTrigger = isClient && !isLoading && state === 'idle' && !statusData?.active && !hasDismissedCookie();
  const delayMs = isLotteryReady ? 0 : POPUP_DELAY_MS;

  useTimeout(() => {
    if (!isEligible.current || data || isPending) return;
    // Pass lottery percentage if UTM lottery triggered
    const lotteryPercent = lotteryResult.current?.eligible
      ? lotteryResult.current.percentOff
      : undefined;
    mutate(lotteryPercent);
  }, shouldTrigger ? delayMs : null);

  // Track analytics when modal opens
  useEffect(() => {
    if (state !== 'modal_open' || !data || flags.current.shown) return;
    flags.current.shown = true;
    analytics.track('discount_popup_shown', {
      discount_code: data.code,
      percent_off: data.percentOff,
      expires_at: data.expiresAt,
      is_lottery: lotteryResult.current?.eligible ?? false,
      lottery_source: lotteryResult.current?.source,
    });
  }, [state, data]);

  // Handle expiry
  useEffect(() => {
    if (!data || !countdown.isComplete) return;
    if (state !== 'modal_open' && state !== 'minimized') return;

    setState('expired');
    clearDiscountCookies();
    analytics.track('discount_expired', {
      discount_code: data.code,
      was_copied: flags.current.copied,
    });
  }, [countdown.isComplete, state, data]);

  // Actions
  const dismiss = useCallback(() => {
    if (!data) return;
    setDismissedCookie();
    setState('minimized');
    analytics.track('discount_popup_dismissed', {
      discount_code: data.code,
      time_remaining_seconds: Math.floor(countdown.total / 1000),
    });
  }, [data, countdown.total]);

  const reopen = useCallback(() => {
    if (!data) return;
    setState('modal_open');
    analytics.track('discount_widget_clicked', {
      discount_code: data.code,
      time_remaining_seconds: Math.floor(countdown.total / 1000),
    });
  }, [data, countdown.total]);

  const copyCode = useCallback(async () => {
    if (!data) return;
    const success = await copyToClipboard(data.code);
    if (success) {
      flags.current.copied = true;
      analytics.track('discount_code_copied', {
        discount_code: data.code,
        time_remaining_seconds: Math.floor(countdown.total / 1000),
      });
    }
  }, [data, countdown.total, copyToClipboard]);

  return {
    state,
    discountData: data,
    countdown: data?.expiresAt ? countdown : EMPTY_COUNTDOWN,
    dismiss,
    reopen,
    copyCode,
    wasCopied: flags.current.copied,
  };
}
