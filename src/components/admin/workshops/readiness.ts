/**
 * Publish-readiness computation for a workshop offering.
 * Used by the card to show "X issues", by the modal checklist, and as the
 * hard gate on the Publish action.
 */

import type { Workshop } from '@/lib/types/database';
import {
  REQUIRED_STRIPE_CURRENCIES,
  REQUIRED_CURRENCIES_LABEL,
  NON_BASE_SUFFIXES_LABEL,
} from '@/config/currency';

export interface ReadinessItem {
  key: ReadinessKey;
  label: string;
  ok: boolean;
  hint?: string;
}

export type ReadinessKey =
  | 'date'
  | 'startTime'
  | 'endTime'
  | 'room'
  | 'capacity'
  | 'stripeProductId'
  | 'stripeLookupKey'
  | 'stripeValidated';

export interface StripeValidation {
  valid: boolean;
  results: Array<{
    lookupKey: string;
    priceId: string | null;
    currency: string | null;
  }>;
}

export interface ReadinessInput {
  offering: Workshop;
  /** Form draft values — takes precedence over offering when the admin has unsaved edits. */
  draft?: {
    date?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    room?: string | null;
    capacity?: number | null;
    stripeProductId?: string | null;
    stripePriceLookupKey?: string | null;
  };
  validation?: StripeValidation | null;
}

const pick = <T,>(draft: T | null | undefined, fallback: T | null | undefined): T | null | undefined =>
  draft !== undefined ? draft : fallback;

function isNonEmpty(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function durationFromTimes(start: string, end: string): number | null {
  if (!/^\d{2}:\d{2}/.test(start) || !/^\d{2}:\d{2}/.test(end)) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (e <= s) return null;
  return e - s;
}

/** Readiness derivable from the offering row alone — no Stripe round trip. */
export function computeStaticReadiness(input: ReadinessInput): ReadinessItem[] {
  const { offering, draft } = input;
  const date = pick(draft?.date, offering.date);
  const start = pick(draft?.startTime, offering.start_time);
  const end = pick(draft?.endTime, offering.end_time);
  const room = pick(draft?.room, offering.room);
  const capacity = pick(draft?.capacity, offering.capacity);
  const productId = pick(draft?.stripeProductId, offering.stripe_product_id);
  const lookupKey = pick(draft?.stripePriceLookupKey, offering.stripe_price_lookup_key);

  const validDuration =
    isNonEmpty(start) && isNonEmpty(end) ? durationFromTimes(start as string, end as string) : null;

  return [
    { key: 'date', label: 'Date set', ok: isNonEmpty(date) },
    { key: 'startTime', label: 'Start time set', ok: isNonEmpty(start) },
    {
      key: 'endTime',
      label: 'End time set (after start)',
      ok: isNonEmpty(end) && validDuration !== null,
      hint:
        isNonEmpty(start) && isNonEmpty(end) && validDuration === null
          ? 'End must be after start.'
          : undefined,
    },
    { key: 'room', label: 'Room assigned', ok: isNonEmpty(room) },
    {
      key: 'capacity',
      label: 'Capacity > 0',
      ok: typeof capacity === 'number' ? capacity > 0 : false,
    },
    {
      key: 'stripeProductId',
      label: 'Stripe product id set',
      ok: isNonEmpty(productId),
      hint: 'Paste a `prod_…` id from the Stripe dashboard.',
    },
    {
      key: 'stripeLookupKey',
      label: 'Stripe price lookup key set',
      ok: isNonEmpty(lookupKey),
      hint: `Base CHF key — runtime will append \`${NON_BASE_SUFFIXES_LABEL}\`.`,
    },
  ];
}

export function computeFullReadiness(input: ReadinessInput): {
  items: ReadinessItem[];
  isReady: boolean;
  openItems: number;
} {
  const base = computeStaticReadiness(input);
  const validationItem: ReadinessItem = {
    key: 'stripeValidated',
    label: `Validated in ${REQUIRED_CURRENCIES_LABEL}`,
    ok: input.validation?.valid === true,
    hint: input.validation
      ? input.validation.valid
        ? undefined
        : 'Run "Validate Stripe" — at least one currency is missing or points at a different product.'
      : `Click "Validate Stripe" to confirm all ${REQUIRED_STRIPE_CURRENCIES.length} prices exist.`,
  };
  const items = [...base, validationItem];
  const openItems = items.filter((i) => !i.ok).length;
  return { items, isReady: openItems === 0, openItems };
}
