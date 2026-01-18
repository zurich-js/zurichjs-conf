/**
 * Voucher Processing
 * Handles workshop voucher purchases from checkout sessions
 */

import type Stripe from 'stripe';
import { sendVoucherConfirmationEmail } from '@/lib/email';
import { getCurrentStage } from '@/config/pricing-stages';
import { logger } from '@/lib/logger';

/**
 * Process workshop voucher purchases
 * Sends confirmation emails for each voucher purchased
 */
export async function processVouchers(
  voucherLineItems: Stripe.LineItem[],
  session: Stripe.Checkout.Session,
  customerEmail: string,
  firstName: string,
  log: ReturnType<typeof logger.scope>
): Promise<void> {
  if (voucherLineItems.length === 0) return;

  log.info('Processing workshop vouchers (FAST PATH)', {
    voucherCount: voucherLineItems.length,
    customerEmail,
    firstName,
  });

  // Get current pricing stage to calculate bonus
  const currentStage = getCurrentStage();
  const bonusPercent = currentStage.stage === 'blind_bird' ? 25 : currentStage.stage === 'early_bird' ? 15 : 0;

  log.debug('Current pricing stage', {
    stage: currentStage.stage,
    bonusPercent,
  });

  for (const voucherItem of voucherLineItems) {
    const price = voucherItem.price as Stripe.Price | undefined;
    const quantity = voucherItem.quantity || 1;
    const amountPerVoucher = price?.unit_amount || 0;
    const currency = (price?.currency || session.currency || 'CHF').toUpperCase();

    log.debug('Processing voucher', {
      priceId: price?.id,
      quantity,
      amountPerVoucher: amountPerVoucher / 100,
      currency,
      bonusPercent,
    });

    // Send a voucher email for each quantity
    for (let i = 0; i < quantity; i++) {
      const amountPaid = amountPerVoucher / 100;
      const bonusAmount = (amountPaid * bonusPercent) / 100;
      const voucherValue = amountPaid + bonusAmount;

      log.debug(`Sending voucher email ${i + 1}/${quantity}`, { email: customerEmail });

      try {
        const result = await sendVoucherConfirmationEmail({
          to: customerEmail,
          firstName,
          amountPaid,
          voucherValue,
          currency,
          bonusPercent: bonusPercent > 0 ? bonusPercent : undefined,
          orderUrl: undefined,
        });

        if (result.success) {
          log.info(`Voucher email ${i + 1}/${quantity} sent successfully`, { email: customerEmail });
        } else {
          log.error(`Failed to send voucher email ${i + 1}/${quantity}`, new Error(result.error || 'Unknown error'), {
            type: 'system',
            severity: 'medium',
            code: 'VOUCHER_EMAIL_FAILED',
            email: customerEmail,
          });
        }

        // Rate limiting delay between voucher emails (600ms = 1.67 emails/sec)
        if (i < quantity - 1) {
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      } catch (error) {
        log.error(`Error sending voucher email ${i + 1}/${quantity}`, error, {
          type: 'system',
          severity: 'medium',
          code: 'VOUCHER_EMAIL_ERROR',
          email: customerEmail,
        });
      }
    }
  }

  log.info('Workshop vouchers processed', { count: voucherLineItems.length });
}
