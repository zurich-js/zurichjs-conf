/**
 * useDiscount Hook
 *
 * Manages the discount popup lifecycle entirely client-side.
 * Uses TanStack Query for API calls and usehooks-ts for utilities.
 *
 * Everyone gets the same offer (the former `aggressive-20` variant — the
 * A/B/C experiment concluded in its favor). The code is email-gated: the
 * popup first advertises the offer with an email field, and the code is only
 * generated once an email is submitted. Known ticket holders never see it.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useCopyToClipboard, useTimeout, useIsClient } from 'usehooks-ts';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';
import {
  discountStatusQueryOptions,
  discountClientConfigQueryOptions,
} from '@/lib/queries/discount';
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
  recordVisit,
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
/** Used only when the config API fails and we run on env fallbacks */
const FALLBACK_COOLDOWN_HOURS = 6;
/** Sentinel discount_code for popup events fired before a code exists */
const EMAIL_GATE_CODE = 'email_gate';
/** Advertised offer when the config API hasn't resolved (matches env default) */
const FALLBACK_OFFER_PERCENT = 20;
const EMPTY_COUNTDOWN: TimeRemaining = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  total: 0,
  isComplete: false,
};

interface GenerateDiscountParams {
  email: string;
  lotteryPercentOff?: number;
}

// API call — the offer itself is resolved server-side from the admin config;
// the client sends only the gate email (and the lottery percentage when set).
async function generateDiscount({
  email,
  lotteryPercentOff,
}: GenerateDiscountParams): Promise<DiscountData> {
  const payload: Record<string, unknown> = { email };
  if (lotteryPercentOff) payload.percentOff = lotteryPercentOff;

  const res = await fetch('/api/discount/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to generate discount');
  return res.json();
}

export function useDiscount() {
  const isClient = useIsClient();
  // Core state
  const [state, setState] = useState<DiscountState>('idle');
  const [data, setData] = useState<DiscountData | null>(null);

  // One-time flags
  const flags = useRef({ shown: false, copied: false, eligibilityChecked: false });
  const isEligible = useRef(false);
  const lotteryResult = useRef<LotteryResult | null>(null);
  const pendingEmail = useRef<string | null>(null);
  const [isLotteryReady, setIsLotteryReady] = useState(false);
  const [emailSubmitFailed, setEmailSubmitFailed] = useState(false);
  const [codeEmailed, setCodeEmailed] = useState(false);

  // Clipboard
  const [, copyToClipboard] = useCopyToClipboard();

  // Check for existing discount
  const { data: statusData, isLoading } = useQuery({
    ...discountStatusQueryOptions,
    enabled: isClient,
  });

  // Admin-managed popup config (probability, force show, cooldown). Falls
  // back to env-based defaults if the API fails so the popup still works.
  const configQuery = useQuery({
    ...discountClientConfigQueryOptions,
    enabled: isClient,
  });
  const config = useMemo(() => {
    if (configQuery.data) return configQuery.data;
    if (configQuery.isError) {
      return { ...getClientConfig(), cooldownHours: FALLBACK_COOLDOWN_HOURS };
    }
    return null; // still loading — eligibility check waits
  }, [configQuery.data, configQuery.isError]);
  const configOfferPercentOff = configQuery.data?.offerPercentOff ?? FALLBACK_OFFER_PERCENT;
  // Lottery visitors won a specific percentage — the gate must advertise that
  // number, not the standard popup offer.
  const offerPercentOff = lotteryResult.current?.eligible
    ? lotteryResult.current.percentOff
    : configOfferPercentOff;

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

  // Generate discount mutation — runs when the visitor submits their email
  // on the gate step. The email is the price of the code.
  const { mutate, isPending } = useMutation({
    mutationFn: generateDiscount,
    onSuccess: (discount) => {
      setEmailSubmitFailed(false);
      setData(discount);
      // Respect a dismissal that happened while the code was generating —
      // never snap the modal back open over the user's explicit close.
      setState((prev) => (prev === 'minimized' ? 'minimized' : 'modal_open'));
      const email = pendingEmail.current;
      if (email) {
        setCodeEmailed(true);
        analytics.identify(email);
        analytics.track('discount_email_captured', {
          discount_code: discount.code,
          percent_off: discount.percentOff,
          email,
        } as EventProperties<'discount_email_captured'>);
      }
    },
    onError: () => setEmailSubmitFailed(true),
  });

  // Countdown - use a far future date as fallback to avoid hydration issues
  const fallbackExpiry = useRef(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString());
  const countdown = useCountdown(data?.expiresAt ?? fallbackExpiry.current);

  // Determine eligibility once the admin-managed config has resolved
  useEffect(() => {
    if (!isClient || !config || flags.current.eligibilityChecked) return;
    flags.current.eligibilityChecked = true;

    // Count this visit so recurring non-buyers stay identifiable in analytics.
    const visitCount = recordVisit();

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
      setCooldownCookie(config.cooldownHours);
    }

    trackEligibility({
      was_eligible: isEligible.current,
      had_cooldown: false,
      was_force_shown: false,
    });
  }, [isClient, config]);

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

  // Show popup after delay if eligible (lottery shows immediately, normal has
  // 15s delay). Waits for the config to resolve so the eligibility check has
  // run before the timer fires.
  const shouldTrigger =
    isClient && !isLoading && config !== null && state === 'idle' && !statusData?.active && !hasDismissedCookie();
  const delayMs = isLotteryReady ? 0 : POPUP_DELAY_MS;

  useTimeout(() => {
    if (!isEligible.current || data || isPending) return;
    // Open the email gate — the code is only generated after the visitor
    // submits their email (submitEmail below).
    setState('modal_open');
  }, shouldTrigger ? delayMs : null);

  // Track when the gate opens. The code doesn't exist yet, so the event
  // carries the EMAIL_GATE_CODE sentinel and the advertised offer percent.
  useEffect(() => {
    if (state !== 'modal_open' || data || flags.current.shown) return;
    flags.current.shown = true;
    analytics.track('discount_popup_shown', {
      discount_code: EMAIL_GATE_CODE,
      percent_off: lotteryResult.current?.eligible
        ? lotteryResult.current.percentOff
        : offerPercentOff,
      expires_at: '',
      is_lottery: lotteryResult.current?.eligible ?? false,
      lottery_source: lotteryResult.current?.source,
      personalized: personalization !== null,
      detected_stack: personalization?.stack,
    });
  }, [state, data, personalization, offerPercentOff]);

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
  const submitEmail = useCallback((email: string) => {
    if (data || isPending) return;
    pendingEmail.current = email;
    mutate({
      email,
      lotteryPercentOff: lotteryResult.current?.eligible
        ? lotteryResult.current.percentOff
        : undefined,
    });
  }, [data, isPending, mutate]);

  const dismiss = useCallback(() => {
    // The dismissed cookie stops the popup auto-triggering on later visits;
    // within this session it always minimizes to the corner widget — with or
    // without a code — so the offer stays reachable on screen.
    setDismissedCookie();
    setState('minimized');
    analytics.track('discount_popup_dismissed', {
      discount_code: data?.code ?? EMAIL_GATE_CODE,
      time_remaining_seconds: data ? Math.floor(countdown.total / 1000) : 0,
    });
  }, [data, countdown.total]);

  const reopen = useCallback(() => {
    // Without a code this reopens the email gate
    setState('modal_open');
    analytics.track('discount_widget_clicked', {
      discount_code: data?.code ?? EMAIL_GATE_CODE,
      time_remaining_seconds: data ? Math.floor(countdown.total / 1000) : 0,
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
    personalization,
    offerPercentOff,
    isGeneratingCode: isPending,
    emailSubmitFailed,
    codeEmailed,
    submitEmail,
    dismiss,
    reopen,
    copyCode,
    wasCopied: flags.current.copied,
  };
}
