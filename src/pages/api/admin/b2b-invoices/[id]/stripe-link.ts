/**
 * Generate Stripe Payment Link for B2B Invoice
 * POST /api/admin/b2b-invoices/[id]/stripe-link
 *
 * Creates a Stripe Payment Link for the invoice total and stores it.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { getInvoice } from '@/lib/b2b';
import { createServiceRoleClient } from '@/lib/supabase';
import { getStripeClient } from '@/lib/stripe/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid invoice ID' });
  }

  try {
    // Get invoice data
    const invoice = await getInvoice(id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check if payment link already exists
    if (invoice.stripe_payment_link_url) {
      return res.status(200).json({
        success: true,
        paymentLinkUrl: invoice.stripe_payment_link_url,
        paymentLinkId: invoice.stripe_payment_link_id,
        message: 'Payment link already exists',
      });
    }

    // Check payment method
    if (invoice.payment_method !== 'stripe') {
      return res.status(400).json({
        error: 'Invoice payment method must be set to "stripe" to generate a payment link',
      });
    }

    const stripe = getStripeClient();

    // Map ticket category/stage to description
    const categoryLabels: Record<string, string> = {
      standard: 'Standard',
      student: 'Student',
      unemployed: 'Job Seeker',
      vip: 'VIP',
    };
    const stageLabels: Record<string, string> = {
      blind_bird: 'Blind Bird',
      early_bird: 'Early Bird',
      general_admission: 'General Admission',
      late_bird: 'Late Bird',
    };

    const ticketDescription = `ZurichJS Conference 2026 - ${categoryLabels[invoice.ticket_category] || invoice.ticket_category} Ticket (${stageLabels[invoice.ticket_stage] || invoice.ticket_stage})`;

    // Create a Stripe Product for this invoice
    const product = await stripe.products.create({
      name: `${invoice.invoice_number} - ${ticketDescription}`,
      description: `B2B Invoice ${invoice.invoice_number} for ${invoice.company_name} - ${invoice.ticket_quantity}x tickets`,
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        company_name: invoice.company_name,
        is_b2b: 'true',
      },
    });

    // Create a Price for the product (total amount)
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: invoice.total_amount,
      currency: invoice.currency.toLowerCase(),
    });

    // Create the Payment Link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        company_name: invoice.company_name,
        is_b2b: 'true',
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://zurichjs.com'}/b2b/payment-success?invoice=${invoice.invoice_number}`,
        },
      },
      // Collect billing address
      billing_address_collection: 'required',
      // Allow promotion codes
      allow_promotion_codes: false,
      // Require customer email
      customer_creation: 'always',
    });

    // Update invoice with payment link details
    const supabase = createServiceRoleClient();
    const { error: updateError } = await supabase
      .from('b2b_invoices')
      .update({
        stripe_payment_link_id: paymentLink.id,
        stripe_payment_link_url: paymentLink.url,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating invoice with payment link:', updateError);
      // Don't fail - the payment link was created, we just failed to save it
    }

    return res.status(200).json({
      success: true,
      paymentLinkUrl: paymentLink.url,
      paymentLinkId: paymentLink.id,
    });
  } catch (error) {
    console.error('Error creating Stripe payment link:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create payment link',
    });
  }
}
