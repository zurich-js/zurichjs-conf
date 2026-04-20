/**
 * Workshop Checkout API
 * POST /api/workshops/checkout - Create a Stripe checkout session for workshops
 *
 * Supports:
 * - Workshop-only checkout (requires existing ticket)
 * - Combo checkout (ticket + workshop, 10% off)
 * - Multi-workshop checkout (no time conflicts)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getStripeClient } from '@/lib/stripe/client';
import { getWorkshopById } from '@/lib/workshops';
import { validateWorkshopSelection, canBookWorkshop } from '@/lib/workshops/validation';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { COMBO_DISCOUNT_PERCENT } from '@/lib/types/workshop';
import type { WorkshopDetail } from '@/lib/types/workshop';

const log = logger.scope('Workshop Checkout');

const checkoutSchema = z.object({
  workshop_ids: z.array(z.string().uuid()).min(1).max(4),
  include_conference_ticket: z.boolean().optional().default(false),
  ticket_price_id: z.string().optional(),
  customer_info: z.object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    company: z.string().optional(),
    address_line1: z.string().min(1),
    address_line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().optional(),
    postal_code: z.string().min(1),
    country: z.string().min(1),
  }),
  coupon_code: z.string().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      return;
    }

    const { workshop_ids, include_conference_ticket, ticket_price_id, customer_info, coupon_code } = parsed.data;

    // Fetch all requested workshops
    const workshops: WorkshopDetail[] = [];
    for (const id of workshop_ids) {
      const result = await getWorkshopById(id);
      if (!result.success || !result.workshop) {
        res.status(404).json({ error: `Workshop not found: ${id}` });
        return;
      }
      workshops.push(result.workshop);
    }

    // Validate all workshops can be booked
    for (const workshop of workshops) {
      const check = canBookWorkshop(workshop);
      if (!check.allowed) {
        res.status(400).json({ error: `${workshop.title}: ${check.reason}` });
        return;
      }
    }

    // Validate no time slot conflicts
    const publicWorkshops = workshops.map(w => ({
      id: w.id,
      title: w.title,
      time_slot: w.time_slot,
      capacity: w.capacity,
      seats_remaining: Math.max(0, w.capacity - w.enrolled_count),
      is_sold_out: w.enrolled_count >= w.capacity,
    }));
    const validation = validateWorkshopSelection(publicWorkshops);
    if (!validation.valid) {
      res.status(400).json({ error: validation.errors.join('; ') });
      return;
    }

    // If not including a ticket, verify user has an existing conference ticket
    if (!include_conference_ticket) {
      const supabase = createServiceRoleClient();
      const { data: ticket } = await supabase
        .from('tickets')
        .select('id')
        .eq('email', customer_info.email)
        .eq('status', 'confirmed')
        .limit(1)
        .single();

      if (!ticket) {
        res.status(400).json({
          error: 'A conference ticket is required to book workshops. You can add one during checkout.',
          code: 'TICKET_REQUIRED',
        });
        return;
      }
    }

    // Build Stripe line items
    const stripe = getStripeClient();
    const lineItems: Array<{ price: string; quantity: number }> = [];

    // Add workshop line items
    for (const workshop of workshops) {
      if (!workshop.stripe_price_id) {
        res.status(400).json({ error: `Workshop "${workshop.title}" is not configured for payment` });
        return;
      }
      lineItems.push({ price: workshop.stripe_price_id, quantity: 1 });
    }

    // Add conference ticket if combo purchase
    if (include_conference_ticket && ticket_price_id) {
      lineItems.push({ price: ticket_price_id, quantity: 1 });
    }

    // Build metadata
    const metadata: Record<string, string> = {
      type: 'workshop_booking',
      workshop_ids: JSON.stringify(workshop_ids),
      firstName: customer_info.first_name,
      lastName: customer_info.last_name,
      email: customer_info.email,
      company: customer_info.company || '',
      is_combo: include_conference_ticket ? 'true' : 'false',
    };

    // Get base URL for redirect
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    // Create Stripe coupon for combo discount if applicable
    let discounts: Array<{ coupon: string }> | undefined;
    if (include_conference_ticket && !coupon_code) {
      // Create a one-time combo discount coupon
      const comboCoupon = await stripe.coupons.create({
        percent_off: COMBO_DISCOUNT_PERCENT,
        duration: 'once',
        name: 'Workshop + Ticket Combo Discount',
        max_redemptions: 1,
        metadata: { type: 'workshop_combo' },
      });
      discounts = [{ coupon: comboCoupon.id }];
      metadata.combo_coupon_id = comboCoupon.id;
    } else if (coupon_code) {
      discounts = [{ coupon: coupon_code }];
    }

    // Get or create customer
    const existingCustomers = await stripe.customers.list({
      email: customer_info.email,
      limit: 1,
    });

    let customerId: string;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        name: `${customer_info.first_name} ${customer_info.last_name}`,
        email: customer_info.email,
        phone: customer_info.phone || undefined,
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer: customerId,
      metadata,
      success_url: `${baseUrl}/workshops/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/workshops`,
      ...(discounts ? { discounts } : {}),
    });

    log.info('Workshop checkout session created', {
      sessionId: session.id,
      workshopCount: workshop_ids.length,
      isCombo: include_conference_ticket,
    });

    res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (error) {
    log.error('Error creating workshop checkout', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout';
    res.status(500).json({ error: message });
  }
}
