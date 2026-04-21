/**
 * Server-side validation for workshop cart items.
 * Called from /api/create-checkout-session before handing the cart off to Stripe.
 *
 * Closes the attack surface where a user edits the base64-encoded cart URL and
 * pairs a cheap price with an expensive workshop, or passes an unpublished /
 * non-existent workshop id, or a price that belongs to a different workshop.
 */

import Stripe from 'stripe';
import type { CartItem } from '@/types/cart';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { Workshop, WorkshopStatus } from '@/lib/types/database';
import { stripCurrencySuffix, isWorkshopPrice } from '@/lib/stripe/ticket-utils';

const log = logger.scope('Workshop Cart Validation');

export interface WorkshopCartValidationResult {
  valid: boolean;
  error?: string;
  /**
   * Hydrated workshops keyed by the resolved workshop row id. Useful for the
   * caller who wants to know which workshops were part of the validated cart.
   */
  workshopsById?: Map<string, Workshop>;
}

export interface WorkshopCartValidationInput {
  items: CartItem[];
  stripe: Stripe;
}

/**
 * Validates every workshop-kind cart item against the DB + Stripe. Rejects
 * on any of:
 * - workshop id missing / doesn't exist
 * - workshop not published
 * - priceId doesn't belong to a workshop Stripe product
 * - priceId doesn't belong to THIS workshop's Stripe product
 * - quantity <= 0 or quantity > remaining capacity
 */
export async function validateWorkshopCartItems(
  input: WorkshopCartValidationInput
): Promise<WorkshopCartValidationResult> {
  const workshopItems = input.items.filter((item) => item.kind === 'workshop');
  if (workshopItems.length === 0) {
    return { valid: true, workshopsById: new Map() };
  }

  const missingWorkshopId = workshopItems.some(
    (item) => typeof item.workshopId !== 'string' || item.workshopId.length === 0
  );

  if (missingWorkshopId) {
    return { valid: false, error: 'Every workshop in the cart must include a workshopId.' };
  }

  // Pull all referenced workshops in one query.
  const workshopIds = Array.from(new Set(workshopItems.map((item) => item.workshopId!)));
  const quantityByWorkshopId = new Map<string, number>();
  for (const item of workshopItems) {
    quantityByWorkshopId.set(
      item.workshopId!,
      (quantityByWorkshopId.get(item.workshopId!) ?? 0) + item.quantity
    );
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('workshops')
    .select('*')
    .in('id', workshopIds);

  if (error) {
    log.error('Failed to load workshops for cart validation', error);
    return { valid: false, error: 'Could not verify workshops — please try again.' };
  }

  const workshopsById = new Map<string, Workshop>();
  for (const row of (data ?? []) as Workshop[]) {
    workshopsById.set(row.id, row);
  }

  for (const item of workshopItems) {
    const workshop = workshopsById.get(item.workshopId!);
    if (!workshop) {
      return { valid: false, error: `Workshop ${item.workshopId} not found.` };
    }
    if ((workshop.status as WorkshopStatus) !== 'published') {
      return { valid: false, error: `"${workshop.title}" is no longer available.` };
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { valid: false, error: `Invalid quantity for "${workshop.title}".` };
    }
  }

  for (const [workshopId, quantity] of quantityByWorkshopId) {
    const workshop = workshopsById.get(workshopId)!;
    const remaining = Math.max(0, (workshop.capacity ?? 0) - (workshop.enrolled_count ?? 0));
    if (quantity > remaining) {
      return {
        valid: false,
        error: `Only ${remaining} seat(s) remain for "${workshop.title}".`,
      };
    }
  }

  // Verify the Stripe priceId actually belongs to this workshop's product.
  const uniquePriceIds = Array.from(new Set(workshopItems.map((item) => item.priceId)));
  const prices = await Promise.all(
    uniquePriceIds.map((id) => input.stripe.prices.retrieve(id).catch(() => null))
  );
  const priceById = new Map<string, Stripe.Price>();
  for (const price of prices) {
    if (price) priceById.set(price.id, price);
  }

  for (const item of workshopItems) {
    const price = priceById.get(item.priceId);
    if (!price) {
      return { valid: false, error: `Unknown Stripe price ${item.priceId}.` };
    }
    if (!isWorkshopPrice(price)) {
      return {
        valid: false,
        error: `Stripe price ${item.priceId} is not a workshop price.`,
      };
    }

    const workshop = workshopsById.get(item.workshopId!)!;
    const expectedProductId = workshop.stripe_product_id;
    const actualProductId =
      typeof price.product === 'string' ? price.product : price.product.id;

    if (!expectedProductId || expectedProductId !== actualProductId) {
      log.warn('Workshop priceId product mismatch', {
        workshopId: workshop.id,
        expectedProductId,
        actualProductId,
        priceId: item.priceId,
      });
      return {
        valid: false,
        error: `Stripe price ${item.priceId} does not belong to "${workshop.title}".`,
      };
    }

    // Also verify the base lookup key matches what the workshops row has.
    const baseKey = price.lookup_key ? stripCurrencySuffix(price.lookup_key) : null;
    if (!baseKey || baseKey !== workshop.stripe_price_lookup_key) {
      log.warn('Workshop priceId lookup_key mismatch', {
        workshopId: workshop.id,
        expectedLookupKey: workshop.stripe_price_lookup_key,
        actualBaseKey: baseKey,
        priceId: item.priceId,
      });
      return {
        valid: false,
        error: `Stripe price ${item.priceId} lookup key does not match "${workshop.title}".`,
      };
    }
  }

  return { valid: true, workshopsById };
}
