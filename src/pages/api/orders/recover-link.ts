/**
 * Order Link Recovery API
 * POST /api/orders/recover-link
 *
 * Emails a freshly signed manage-order link to the address on the ticket.
 * Used when an emailed link no longer verifies (e.g. the secret that signed
 * it was rotated out and lost). The stale token is only used to learn which
 * ticket to look up — it grants no access; the new link goes exclusively to
 * the email already stored on the ticket.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { extractTicketIdUnverified, generateOrderUrl } from '@/lib/auth/orderToken';
import { createServiceRoleClient } from '@/lib/supabase';
import { sendTicketConfirmationEmail } from '@/lib/email';
import { getTicketDisplayName } from '@/lib/stripe/ticket-utils';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const log = logger.scope('Order Link Recovery API');

// Sends email — keep this tight to prevent abuse
const limiter = createRateLimiter({ windowMs: 15 * 60_000, maxRequests: 3 });

const bodySchema = z.object({
  token: z.string().min(1).max(200),
});

// Same generic response whether or not the ticket exists, so the endpoint
// can't be used to probe for valid ticket IDs
const GENERIC_RESPONSE = {
  success: true,
  message: 'If this ticket exists, a new link has been sent to the email address on file.',
} as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { allowed, resetAt } = limiter.check(getClientIp(req));
  if (!allowed) {
    res.setHeader('Retry-After', Math.ceil((resetAt - Date.now()) / 1000));
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const result = bodySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: result.error.issues,
    });
  }

  try {
    const ticketId = extractTicketIdUnverified(result.data.token);

    if (!ticketId) {
      // Not even a ticket-ID-shaped token — nothing to look up
      return res.status(200).json(GENERIC_RESPONSE);
    }

    const supabase = createServiceRoleClient();
    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (fetchError || !ticket) {
      return res.status(200).json(GENERIC_RESPONSE);
    }

    const orderUrl = generateOrderUrl(ticket.id);

    const emailResult = await sendTicketConfirmationEmail({
      to: ticket.email,
      customerName: `${ticket.first_name} ${ticket.last_name}`,
      customerEmail: ticket.email,
      ticketType: getTicketDisplayName(ticket.ticket_category, ticket.ticket_stage),
      orderNumber: ticket.id,
      amountPaid: ticket.amount_paid,
      currency: ticket.currency,
      conferenceDate: 'September 11, 2026',
      conferenceName: 'ZurichJS Conference 2026',
      ticketId: ticket.id,
      qrCodeUrl: ticket.qr_code_url || undefined,
      orderUrl,
      notes: 'You requested a new ticket management link. Older links may no longer work — please use the button in this email from now on.',
    });

    if (!emailResult.success) {
      log.error('Failed to send recovery email', undefined, {
        ticketId: ticket.id,
        error: emailResult.error,
      });
      return res.status(500).json({ error: 'Failed to send email. Please try again later.' });
    }

    log.info('Sent order link recovery email', { ticketId: ticket.id });

    return res.status(200).json(GENERIC_RESPONSE);
  } catch (error) {
    log.error('Error recovering order link', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
