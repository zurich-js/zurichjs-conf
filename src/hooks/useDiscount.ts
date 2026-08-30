/**
 * useDiscount Hook
 *
 * Manages the discount popup lifecycle entirely client-side.
 * Uses TanStack Query for API calls and usehooks-ts for utilities.
 *
 * Everyone gets the same offer (the former `aggressive-20` variant — the
 * A/B/C experiment concluded in its favor). The code is email-gated: the
 * popup first advertises the offer with an email field, and the code is only
 * generated once an email is submitted.
 *
 * There is no eligibility lottery: every visitor who reaches a page where the
 * popup mounts is offered the discount. Only two things suppress it — a
 * browser that already bought a ticket, and an explicit dismissal (which
 * minimizes to the corner widget so the offer stays reachable).
 *
 * Timing and generosity vary by intent signal:
 * - UTM lottery winners see it immediately at the lottery percentage
 * - Recurring visitors (Nth+ visit, still no purchase) see it immediately at
 *   the sweetened recurring rate — they've read the pitch and stalled. Both N
 *   and the rate are admin config, not constants
 * - Everyone else sees it after a 15s dwell at the standard rate
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
import type { DiscountState, DiscountData } from '@/lib/discount/types';
import {
  hasDismissedCookie,
  setDismissedCookie,
  clearDiscountCookies,
  isKnownTicketHolder,
  isRecurringVisitor,
  buildDiscountPersonalization,
  recordVisit,
  RECURRING_OFFER_DEFAULTS,
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
  visitCount?: number;
}

// API call — the offer itself is resolved server-side from the admin config;
// the client sends only the gate email (and the lottery percentage when set).
async function generateDiscount({
  email,
  lotteryPercentOff,
  visitCount,
}: GenerateDiscountParams): Promise<DiscountData> {
  const payload: Record<string, unknown> = { email };
  if (lotteryPercentOff) payload.percentOff = lotteryPercentOff;
  // The server re-checks the threshold and picks the percentage itself.
  if (visitCount) payload.visitCount = visitCount;

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
  const visits = useRef(0);
  const isRecurring = useRef(false);
  /** Bypasses the dwell delay — set by the UTM lottery or a recurring visitor. */
  const [showImmediately, setShowImmediately] = useState(false);
  const [emailSubmitFailed, setEmailSubmitFailed] = useState(false);
  const [codeEmailed, setCodeEmailed] = useState(false);

  // Clipboard
  const [, copyToClipboard] = useCopyToClipboard();

  // Check for existing discount
  const { data: statusData, isLoading } = useQuery({
    ...discountStatusQueryOptions,
    enabled: isClient,
  });

  // Admin-managed popup config — now just the advertised offer percentage.
  // The gate renders that number, so the popup waits for the query to settle
  // (success or error) rather than flashing the fallback and correcting itself.
  const configQuery = useQuery({
    ...discountClientConfigQueryOptions,
    enabled: isClient,
  });
  const configResolved = configQuery.isSuccess || configQuery.isError;
  const configOfferPercentOff = configQuery.data?.offerPercentOff ?? FALLBACK_OFFER_PERCENT;
  const configRecurringPercentOff =
    configQuery.data?.recurringOfferPercentOff ?? RECURRING_OFFER_DEFAULTS.percentOff;
  const configRecurringMinVisits =
    configQuery.data?.recurringMinVisits ?? RECURRING_OFFER_DEFAULTS.minVisits;
  // Lottery visitors won a specific percentage — the gate must advertise that
  // number, not the standard popup offer.
  const offerPercentOff = lotteryResult.current?.eligible
    ? lotteryResult.current.percentOff
    : isRecurring.current
      ? configRecurringPercentOff
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

  // Determine eligibility. Every visitor is offered the discount — the random
  // show-probability roll and the cooldown cookie that used to suppress ~84% of
  // exposures are gone. The only remaining suppression is a browser that
  // already bought a ticket; a deliberate dismissal is handled separately by
  // the dismissed cookie in `shouldTrigger` below.
  useEffect(() => {
    if (!isClient || !configResolved || flags.current.eligibilityChecked) return;
    flags.current.eligibilityChecked = true;

    const visitCount = recordVisit();
    visits.current = visitCount;

    // The UTM lottery still overrides the standard offer percentage and shows
    // immediately instead of waiting out the dwell delay.
    const lottery = evaluateUtmLottery(parseUtmParams(window.location.search));
    if (lottery.eligible) {
      lotteryResult.current = lottery;
      setShowImmediately(true);
    }

    // A visitor back for a third look who still hasn't bought is hesitating.
    // Price is the likeliest reason, so skip the dwell delay and lead with the
    // sweetened offer instead of making them sit through 15s again.
    if (isRecurringVisitor(visitCount, configRecurringMinVisits)) {
      isRecurring.current = true;
      setShowImmediately(true);
    }

    // Never offer a discount to someone who already bought a ticket.
    const isTicketHolder = isKnownTicketHolder();
    isEligible.current = !isTicketHolder;

    analytics.track('discount_eligibility_checked', {
      was_eligible: isEligible.current,
      is_known_ticket_holder: isTicketHolder,
      is_recurring_visitor: isRecurring.current,
      visit_count: visitCount,
    });
  }, [isClient, configResolved, configRecurringMinVisits]);

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
  // 15s delay). Waits for the config to resolve so the gate advertises the
  // real offer percentage.
  const shouldTrigger =
    isClient && !isLoading && configResolved && state === 'idle' && !statusData?.active && !hasDismissedCookie();
  const delayMs = showImmediately ? 0 : POPUP_DELAY_MS;

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
      price_sensitivity_reason: isRecurring.current ? 'recurring_visitor' : undefined,
      visit_count: visits.current,
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
      visitCount: visits.current,
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
