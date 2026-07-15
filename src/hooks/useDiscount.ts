/**
 * useDiscount Hook
 *
 * Manages the discount popup lifecycle entirely client-side.
 * Uses TanStack Query for API calls and usehooks-ts for utilities.
 *
 * Experiment: eligible visitors are enrolled in the PostHog experiment
 * `discount-popup-offer` (control 10%/2h vs aggressive-20 20%/1h vs
 * price-sensitive-30 30%/30min) at trigger time. Known ticket holders are
 * excluded before enrollment. The price-sensitive-30 variant is gated to
 * visitors in lower-income European countries (relative to CH) or recurring
 * (3rd+ visit) non-converted visitors — see @/lib/discount/price-sensitivity.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useCopyToClipboard, useTimeout, useIsClient } from 'usehooks-ts';
import posthog from 'posthog-js';
import { analytics } from '@/lib/analytics/client';
import { discountStatusQueryOptions } from '@/lib/queries/discount';
import { publicSpeakersQueryOptions } from '@/lib/queries/speakers';
import { getClientConfig } from '@/lib/discount/config';
import type { DiscountState, DiscountData } from '@/lib/discount/types';
import {
  hasCooldownCookie,
  hasDismissedCookie,
  setCooldownCookie,
  setDismissedCookie,
  clearDiscountCookies,
  isKnownTicketHolder,
  buildDiscountPersonalization,
  DISCOUNT_EXPERIMENT_FLAG,
  isDiscountVariant,
  applyPriceSensitivityGate,
  getPriceSensitivityEligibility,
  getClientDetectedCountry,
  recordVisit,
  getVisitCount,
  type DiscountVariant,
  type PriceSensitivityEligibility,
} from '@/lib/discount';
import {
  evaluateUtmLottery,
  parseUtmParams,
  type LotteryResult,
} from '@/lib/discount/utm-lottery';
import { getDetectedTraits } from '@/lib/analytics/techStackDetector';
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

interface GenerateDiscountParams {
  lotteryPercentOff?: number;
  variant?: DiscountVariant;
  priceSensitivityReason?: PriceSensitivityEligibility['reason'];
}

// API call
async function generateDiscount({
  lotteryPercentOff,
  variant,
  priceSensitivityReason,
}: GenerateDiscountParams): Promise<DiscountData> {
  const payload: Record<string, unknown> = {};
  if (lotteryPercentOff) payload.percentOff = lotteryPercentOff;
  if (variant) payload.variant = variant;
  if (priceSensitivityReason) payload.priceSensitivityReason = priceSensitivityReason;

  const hasBody = Object.keys(payload).length > 0;
  const res = await fetch('/api/discount/generate', {
    method: 'POST',
    headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
    body: hasBody ? JSON.stringify(payload) : undefined,
  });
  if (!res.ok) throw new Error('Failed to generate discount');
  return res.json();
}

/**
 * Resolves the experiment variant from PostHog at trigger time.
 * - Returns a variant when enrolled.
 * - Returns 'excluded' when the flag explicitly evaluates to false
 *   (release conditions exclude this person, e.g. identified ticket holders).
 * - Returns undefined when flags are unavailable (blocked/not loaded) —
 *   the visitor gets control behavior without polluting the experiment.
 *
 * `priceSensitiveEligible` is reported to PostHog as a flag-evaluation person
 * property so the experiment can target the price-sensitive-30 variant to
 * eligible visitors only (see experiment.ts for the PostHog setup).
 */
function resolveExperimentVariant(
  priceSensitiveEligible: boolean
): DiscountVariant | 'excluded' | undefined {
  try {
    posthog.setPersonPropertiesForFlags(
      { price_sensitive_eligible: priceSensitiveEligible },
      false // don't force an extra flag reload — getFeatureFlag evaluates below
    );
    // Also reports flag exposure ($feature_flag_called) to PostHog
    const value = posthog.getFeatureFlag(DISCOUNT_EXPERIMENT_FLAG);
    if (value === false) return 'excluded';
    return isDiscountVariant(value) ? value : undefined;
  } catch {
    return undefined;
  }
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
  const experimentVariant = useRef<DiscountVariant | null>(null);
  const priceSensitivity = useRef<PriceSensitivityEligibility | null>(null);
  const variantDowngraded = useRef(false);
  const [isLotteryReady, setIsLotteryReady] = useState(false);

  // Clipboard
  const [, copyToClipboard] = useCopyToClipboard();

  // Check for existing discount
  const { data: statusData, isLoading } = useQuery({
    ...discountStatusQueryOptions,
    enabled: isClient,
  });

  // Speaker lineup for tech-stack personalization. On the homepage (the only
  // place the popup mounts) this is already in the hydrated SSR cache.
  const { data: speakersData } = useQuery({
    ...publicSpeakersQueryOptions(),
    enabled: isClient,
  });

  // Personalize popup copy from the visitor's detected tech stack.
  // Recomputed on state transitions so the traits (detected after idle)
  // are available by the time the modal opens.
  const personalization = useMemo(() => {
    if (!isClient || state === 'idle') return null;
    return buildDiscountPersonalization(
      getDetectedTraits()?.framework_primary,
      speakersData?.speakers
    );
  }, [isClient, state, speakersData]);

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

    // Count this visit so the experiment can tell recurring visitors apart,
    // and pre-report price-sensitivity eligibility to PostHog so the flag's
    // variant targeting has reloaded by the time the popup triggers (15s).
    const visitCount = recordVisit();
    const earlyEligibility = getPriceSensitivityEligibility({
      countryCode: getClientDetectedCountry(),
      visitCount,
    });
    try {
      posthog.setPersonPropertiesForFlags({
        price_sensitive_eligible: earlyEligibility.eligible,
      });
    } catch {
      // PostHog unavailable — the local hard gate still applies.
    }

    const trackEligibility = (props: {
      was_eligible: boolean;
      had_cooldown: boolean;
      was_force_shown: boolean;
      is_known_ticket_holder?: boolean;
    }) => analytics.track('discount_eligibility_checked', { ...props, visit_count: visitCount });

    // Check UTM lottery first (overrides normal flow)
    const utmParams = parseUtmParams(window.location.search);
    const lottery = evaluateUtmLottery(utmParams);

    if (lottery.eligible) {
      isEligible.current = true;
      lotteryResult.current = lottery;
      setIsLotteryReady(true); // Trigger immediate display
      trackEligibility({ was_eligible: true, had_cooldown: false, was_force_shown: false });
      return;
    }

    if (config.forceShow) {
      isEligible.current = true;
      trackEligibility({ was_eligible: true, had_cooldown: false, was_force_shown: true });
      return;
    }

    // Never offer a discount to someone who already bought a ticket
    if (isKnownTicketHolder()) {
      isEligible.current = false;
      trackEligibility({
        was_eligible: false,
        had_cooldown: false,
        was_force_shown: false,
        is_known_ticket_holder: true,
      });
      return;
    }

    if (hasCooldownCookie()) {
      isEligible.current = false;
      trackEligibility({ was_eligible: false, had_cooldown: true, was_force_shown: false });
      return;
    }

    isEligible.current = Math.random() < config.showProbability;

    if (!isEligible.current) {
      setCooldownCookie(COOLDOWN_HOURS);
    }

    trackEligibility({
      was_eligible: isEligible.current,
      had_cooldown: false,
      was_force_shown: false,
    });
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

    // Lottery discounts bypass the experiment entirely
    if (lotteryResult.current?.eligible) {
      mutate({ lotteryPercentOff: lotteryResult.current.percentOff });
      return;
    }

    // Recompute price-sensitivity eligibility fresh at trigger time — the
    // country cookie (set async by CurrencyContext via /api/geo/detect) is
    // normally present by now even on a first visit.
    const eligibility = getPriceSensitivityEligibility({
      countryCode: getClientDetectedCountry(),
      visitCount: getVisitCount(),
    });
    priceSensitivity.current = eligibility;

    // Enroll in the A/B/C experiment at trigger time (counts as flag exposure)
    const assigned = resolveExperimentVariant(eligibility.eligible);
    if (assigned === 'excluded') return; // e.g. ticket holder identified in PostHog

    // Hard guard: never serve the price-sensitive offer to an ineligible visitor
    const gated = assigned ? applyPriceSensitivityGate(assigned, eligibility.eligible) : null;
    variantDowngraded.current = gated?.downgraded ?? false;

    experimentVariant.current = gated?.variant ?? null;
    mutate({
      variant: gated?.variant,
      priceSensitivityReason:
        gated?.variant === 'price-sensitive-30' ? eligibility.reason : null,
    });
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
      experiment_variant: experimentVariant.current ?? undefined,
      variant_downgraded: variantDowngraded.current || undefined,
      price_sensitivity_reason: priceSensitivity.current?.reason ?? undefined,
      personalized: personalization !== null,
      detected_stack: personalization?.stack,
    });
  }, [state, data, personalization]);

  // Handle expiry
  useEffect(() => {
    if (!data || !countdown.isComplete) return;
    if (state !== 'modal_open' && state !== 'minimized') return;

    setState('expired');
    clearDiscountCookies();
    analytics.track('discount_expired', {
      discount_code: data.code,
      was_copied: flags.current.copied,
      experiment_variant: experimentVariant.current ?? undefined,
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
      experiment_variant: experimentVariant.current ?? undefined,
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
        experiment_variant: experimentVariant.current ?? undefined,
      });
    }
  }, [data, countdown.total, copyToClipboard]);

  return {
    state,
    discountData: data,
    countdown: data?.expiresAt ? countdown : EMPTY_COUNTDOWN,
    personalization,
    dismiss,
    reopen,
    copyCode,
    wasCopied: flags.current.copied,
  };
}
