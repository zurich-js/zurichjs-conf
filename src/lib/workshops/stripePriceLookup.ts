/**
 * Shared Stripe price lookup helpers for workshop offerings.
 * Used by both /api/workshops/pricing and /api/workshops/schedule.
 */

import Stripe from 'stripe';
import type { SupportedCurrency } from '@/config/currency';
import type { Workshop } from '@/lib/types/database';
import { logger } from '@/lib/logger';

const log = logger.scope('Workshop Stripe Lookup');

export interface WorkshopOfferingSummary {
  workshopId: string;
  cfpSubmissionId: string | null;
  slug: string;
  lookupKey: string;
  priceId: string;
  stripeProductId: string | null;
  unitAmount: number;
  currency: string;
  capacity: number;
  enrolledCount: number;
  capacityRemaining: number;
  soldOut: boolean;
  room: string | null;
  durationMinutes: number | null;
}

export const getStripeClient = (): Stripe => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(secretKey, { apiVersion: '2025-10-29.clover' });
};

export const applyCurrencySuffix = (baseKey: string, currency: SupportedCurrency): string => {
  if (currency === 'EUR') return `${baseKey}_eur`;
  if (currency === 'GBP') return `${baseKey}_gbp`;
  return baseKey;
};

export const fetchStripePriceByLookupKey = async (
  stripe: Stripe,
  lookupKey: string
): Promise<Stripe.Price | null> => {
  try {
    const { data } = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });
    return data[0] ?? null;
  } catch (error) {
    log.warn('Failed to fetch Stripe price', {
      lookupKey,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
};

export const slugForWorkshop = (workshop: Workshop): string | null => {
  return workshop.stripe_price_lookup_key
    ? workshop.stripe_price_lookup_key.replace(/^workshop_/, '')
    : null;
};

/**
 * Given a published workshop offering, fetch its Stripe price for the target
 * currency and build a flat summary object. Returns null if the price doesn't
 * exist for that currency.
 */
export const buildOfferingSummary = async (
  stripe: Stripe,
  workshop: Workshop,
  targetCurrency: SupportedCurrency
): Promise<WorkshopOfferingSummary | null> => {
  if (!workshop.stripe_price_lookup_key) return null;

  const lookupKey = applyCurrencySuffix(workshop.stripe_price_lookup_key, targetCurrency);
  const price = await fetchStripePriceByLookupKey(stripe, lookupKey);
  if (!price?.unit_amount || !price.currency) return null;

  const capacityRemaining = Math.max(0, (workshop.capacity ?? 0) - (workshop.enrolled_count ?? 0));

  return {
    workshopId: workshop.id,
    cfpSubmissionId: workshop.cfp_submission_id,
    slug: slugForWorkshop(workshop) ?? workshop.id,
    lookupKey,
    priceId: price.id,
    stripeProductId: workshop.stripe_product_id,
    unitAmount: price.unit_amount,
    currency: price.currency.toUpperCase(),
    capacity: workshop.capacity ?? 0,
    enrolledCount: workshop.enrolled_count ?? 0,
    capacityRemaining,
    soldOut: capacityRemaining <= 0,
    room: workshop.room,
    durationMinutes: workshop.duration_minutes,
  };
};

/**
 * Batch-resolve offering summaries. Uses `stripe.prices.list({ lookup_keys })`
 * in chunks of 10 (Stripe's per-request cap) to avoid N round trips when
 * rendering the /workshops schedule.
 */
export const buildOfferingSummaries = async (
  stripe: Stripe,
  workshops: Workshop[],
  targetCurrency: SupportedCurrency
): Promise<WorkshopOfferingSummary[]> => {
  if (workshops.length === 0) return [];

  // Build lookup keys to request from Stripe (skip workshops without a base key).
  type Pending = { workshop: Workshop; lookupKey: string };
  const pending: Pending[] = [];
  for (const workshop of workshops) {
    if (!workshop.stripe_price_lookup_key) continue;
    pending.push({
      workshop,
      lookupKey: applyCurrencySuffix(workshop.stripe_price_lookup_key, targetCurrency),
    });
  }
  if (pending.length === 0) return [];

  const priceByLookupKey = new Map<string, Stripe.Price>();
  const allKeys = pending.map((p) => p.lookupKey);

  // Stripe's prices.list accepts up to 10 lookup_keys per call.
  const chunkSize = 10;
  for (let i = 0; i < allKeys.length; i += chunkSize) {
    const chunk = allKeys.slice(i, i + chunkSize);
    try {
      const { data } = await stripe.prices.list({
        lookup_keys: chunk,
        active: true,
        limit: chunk.length,
      });
      for (const price of data) {
        if (price.lookup_key) priceByLookupKey.set(price.lookup_key, price);
      }
    } catch (error) {
      log.warn('Batch Stripe price lookup failed', {
        chunk,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const out: WorkshopOfferingSummary[] = [];
  for (const { workshop, lookupKey } of pending) {
    const price = priceByLookupKey.get(lookupKey);
    if (!price?.unit_amount || !price.currency) continue;

    const capacityRemaining = Math.max(
      0,
      (workshop.capacity ?? 0) - (workshop.enrolled_count ?? 0)
    );
    out.push({
      workshopId: workshop.id,
      cfpSubmissionId: workshop.cfp_submission_id,
      slug: slugForWorkshop(workshop) ?? workshop.id,
      lookupKey,
      priceId: price.id,
      stripeProductId: workshop.stripe_product_id,
      unitAmount: price.unit_amount,
      currency: price.currency.toUpperCase(),
      capacity: workshop.capacity ?? 0,
      enrolledCount: workshop.enrolled_count ?? 0,
      capacityRemaining,
      soldOut: capacityRemaining <= 0,
      room: workshop.room,
      durationMinutes: workshop.duration_minutes,
    });
  }
  return out;
};
