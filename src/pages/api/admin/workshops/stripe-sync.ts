/**
 * Admin Workshop Stripe Sync API
 * POST /api/admin/workshops/stripe-sync - Create or sync Stripe product/price for a workshop
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminToken } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { getStripeClient } from '@/lib/stripe/client';
import { logger } from '@/lib/logger';
import type { WorkshopDetail } from '@/lib/types/workshop';

const log = logger.scope('Admin Workshop Stripe Sync');

const syncSchema = z.object({
  workshop_id: z.string().uuid(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!verifyAdminToken(req.cookies.admin_token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const parsed = syncSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }

    const supabase = createServiceRoleClient();
    const stripe = getStripeClient();

    // Fetch the workshop - cast to extended type
    const { data: rawWorkshop, error: fetchError } = await supabase
      .from('workshops')
      .select('*')
      .eq('id', parsed.data.workshop_id)
      .single();

    if (fetchError || !rawWorkshop) {
      res.status(404).json({ error: 'Workshop not found' });
      return;
    }

    const workshop = rawWorkshop as unknown as WorkshopDetail;

    let stripeProductId = workshop.stripe_product_id;
    let stripePriceId = workshop.stripe_price_id;

    // Create or update Stripe product
    if (!stripeProductId) {
      const product = await stripe.products.create({
        name: `Workshop: ${workshop.title}`,
        description: workshop.short_abstract || workshop.title,
        metadata: {
          workshop_id: workshop.id,
          type: 'workshop',
        },
      });
      stripeProductId = product.id;
      log.info('Created Stripe product', { productId: product.id, workshopId: workshop.id });
    } else {
      await stripe.products.update(stripeProductId, {
        name: `Workshop: ${workshop.title}`,
        description: workshop.short_abstract || workshop.title,
      });
      log.info('Updated Stripe product', { productId: stripeProductId });
    }

    // Create Stripe price (always create new, archive old)
    if (stripePriceId) {
      try {
        await stripe.prices.update(stripePriceId, { active: false });
      } catch {
        // Price may already be inactive
      }
    }

    const price = await stripe.prices.create({
      product: stripeProductId,
      unit_amount: workshop.price,
      currency: (workshop.currency || 'CHF').toLowerCase(),
      lookup_key: `workshop_${workshop.slug}`,
      transfer_lookup_key: true,
      metadata: {
        workshop_id: workshop.id,
        type: 'workshop',
      },
    });
    stripePriceId = price.id;
    log.info('Created Stripe price', { priceId: price.id, amount: workshop.price });

    // Update workshop with Stripe IDs - use type assertion for extended schema
    const { error: updateError } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('workshops') as any)
      .update({
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
      })
      .eq('id', workshop.id);

    if (updateError) {
      log.error('Error updating workshop with Stripe IDs', updateError);
      res.status(500).json({ error: 'Failed to update workshop' });
      return;
    }

    res.status(200).json({
      success: true,
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId,
    });
  } catch (error) {
    log.error('Error syncing workshop with Stripe', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
