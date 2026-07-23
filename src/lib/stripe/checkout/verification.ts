/**
 * Verification Purchase Linking
 * When an approved student/unemployed verification pays via their Stripe
 * payment link, the checkout session carries `verification_id` in metadata
 * (set in /api/admin/verifications/[id]/approve). This records the session id
 * back on the verification_requests row so the admin dashboard can
 * authoritatively tell who completed their purchase.
 */

import type Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase';
import type { logger } from '@/lib/logger';

/**
 * Link a completed checkout session to its verification request.
 * Non-fatal: never throws — a failed link must not break ticket fulfilment.
 * Idempotent: re-running the webhook writes the same session id again.
 */
export async function linkVerificationPurchase(
  session: Stripe.Checkout.Session,
  log: ReturnType<typeof logger.scope>
): Promise<void> {
  const verificationId = session.metadata?.verification_id;
  if (!verificationId) return;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('verification_requests')
      .update({ stripe_session_id: session.id })
      .eq('id', verificationId)
      .select('id');

    if (error) {
      log.error('Failed to link verification request to checkout session', error, {
        type: 'system',
        severity: 'medium',
        code: 'VERIFICATION_LINK_FAILED',
        verificationId,
      });
      return;
    }

    if (!data || data.length === 0) {
      log.warn('Checkout session references unknown verification request', {
        verificationId,
      });
      return;
    }

    log.info('Linked verification request to checkout session', { verificationId });
  } catch (err) {
    log.error('Unexpected error linking verification request', err, {
      type: 'system',
      severity: 'medium',
      code: 'VERIFICATION_LINK_FAILED',
      verificationId,
    });
  }
}
