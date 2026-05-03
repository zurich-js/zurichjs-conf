/**
 * PaymentStep
 * Renders Stripe Custom Checkout (PaymentElement) inside the cart flow.
 * Uses the Checkout Session's client_secret in embedded mode, which
 * preserves the checkout.session.completed webhook while giving us
 * full control over the payment form UI and prefilled billing details.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckoutElementsProvider,
  PaymentElement,
  useCheckout,
} from '@stripe/react-stripe-js/checkout';
import { ChevronLeft, Lock } from 'lucide-react';
import { getStripePromise } from '@/lib/stripe/client-browser';
import { Button, Heading } from '@/components/atoms';
import { CartSummary } from '@/components/molecules';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';
import { mapCartItemsToAnalytics } from '@/lib/analytics/helpers';
import type { Cart, OrderSummary } from './types';

interface PaymentStepProps {
  clientSecret: string;
  sessionId?: string;
  cart: Cart;
  orderSummary: OrderSummary;
  totalAmount: string;
  currency: string;
  onBack: () => void;
  onPaymentSubmitting?: () => void;
  onPaymentFailed?: () => void;
}

export function PaymentStep({
  clientSecret,
  sessionId,
  cart,
  orderSummary,
  totalAmount,
  currency,
  onBack,
  onPaymentSubmitting,
  onPaymentFailed,
}: PaymentStepProps) {
  const stripePromise = getStripePromise();
  const hasTrackedPaymentView = useRef(false);
  const analyticsContext = getPaymentAnalyticsContext(cart, orderSummary, sessionId);

  useEffect(() => {
    if (hasTrackedPaymentView.current) return;
    hasTrackedPaymentView.current = true;
    analytics.track('payment_step_viewed', {
      ...analyticsContext,
      payment_ui: 'embedded_checkout',
    } as EventProperties<'payment_step_viewed'>);
  }, [analyticsContext]);

  return (
    <motion.div
      key="payment"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-brand-white transition-colors cursor-pointer py-2"
          >
            <ChevronLeft className="size-4" />
            Back to billing
          </button>
        </div>

        <Heading level="h1" className="text-xl font-bold text-brand-white mb-6">
          Complete Payment
        </Heading>

        <div className="grid gap-4 lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="rounded-2xl bg-brand-gray-lightest p-5 sm:p-8">
              <CheckoutElementsProvider
                stripe={stripePromise}
                options={{ clientSecret }}
              >
                <PaymentForm
                  totalAmount={totalAmount}
                  currency={currency}
                  analyticsContext={analyticsContext}
                  onPaymentSubmitting={onPaymentSubmitting}
                  onPaymentFailed={onPaymentFailed}
                />
              </CheckoutElementsProvider>
            </div>

            <p className="mt-4 text-center text-xs text-gray-500 flex items-center justify-center gap-1">
              <Lock className="size-3" />
              Payments are securely processed by Stripe
            </p>
          </div>

          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="sticky top-16 lg:top-24">
              <div className="bg-brand-gray-darkest border border-brand-gray-dark rounded-2xl p-5 sm:p-6 space-y-4">
                <h2 className="text-lg font-bold text-brand-white">Order Summary</h2>
                <div className="space-y-3 border-b border-brand-gray-dark pb-4">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-brand-white break-words">{item.title}</div>
                        <div className="text-brand-gray-light">Qty: {item.quantity}</div>
                      </div>
                      <div className="shrink-0 text-right font-semibold text-brand-white">
                        {(item.price * item.quantity).toFixed(2)} {item.currency}
                      </div>
                    </div>
                  ))}
                </div>

                <CartSummary
                  summary={orderSummary}
                  showTax={false}
                  showDiscount={true}
                  voucherCode={cart.couponCode}
                  discountType={cart.discountType}
                  discountValue={cart.discountValue}
                  isPartialDiscount={
                    cart.applicablePriceIds !== undefined &&
                    cart.applicablePriceIds.length > 0 &&
                    cart.applicablePriceIds.length < cart.items.length
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Inner form — must be inside <CheckoutElementsProvider> to use useCheckout.
 */
function PaymentForm({
  totalAmount,
  currency,
  analyticsContext,
  onPaymentSubmitting,
  onPaymentFailed,
}: {
  totalAmount: string;
  currency: string;
  analyticsContext: PaymentAnalyticsContext;
  onPaymentSubmitting?: () => void;
  onPaymentFailed?: () => void;
}) {
  const checkout = useCheckout();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isReady = checkout.type === 'success';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady) return;

    setIsProcessing(true);
    setErrorMessage(null);
    onPaymentSubmitting?.();
    analytics.track('payment_submitted', {
      ...analyticsContext,
      payment_ui: 'embedded_checkout',
    } as EventProperties<'payment_submitted'>);

    const result = await checkout.checkout.confirm();

    if (result.type === 'error') {
      setErrorMessage(result.error?.message ?? 'An unexpected error occurred.');
      setIsProcessing(false);
      onPaymentFailed?.();
      analytics.track('payment_failed', {
        stripe_session_id: analyticsContext.stripe_session_id,
        payment_status: 'failed',
        payment_method: 'embedded_checkout',
        email: undefined,
        error_message: result.error?.message ?? 'An unexpected error occurred.',
        error_code: result.error?.code,
        error_type: 'payment',
        error_severity: 'high',
        error_context: {
          cart_total_amount: analyticsContext.cart_total_amount,
          cart_currency: analyticsContext.cart_currency,
          purchase_type: analyticsContext.purchase_type,
          ticket_count: analyticsContext.ticket_count,
          workshop_count: analyticsContext.workshop_count,
          seat_count: analyticsContext.seat_count,
        },
      } as EventProperties<'payment_failed'>);
    }
    // On success, Stripe redirects to return_url automatically
  };

  return (
    <form onSubmit={handleSubmit}>
      {!isReady && (
        <div className="py-8 text-center text-gray-500">Loading payment form...</div>
      )}

      <PaymentElement />

      {errorMessage && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={!isReady || isProcessing}
        className="w-full mt-6"
        size="lg"
      >
        {isProcessing ? 'Processing...' : `Pay ${totalAmount} ${currency}`}
      </Button>
    </form>
  );
}

interface PaymentAnalyticsContext {
  cart_item_count: number;
  cart_total_amount: number;
  cart_currency: string;
  cart_items: ReturnType<typeof mapCartItemsToAnalytics>;
  stripe_session_id?: string;
  ticket_count: number;
  workshop_count: number;
  seat_count: number;
  has_discount: boolean;
  coupon_code?: string;
  purchase_type: 'ticket' | 'workshop' | 'mixed';
}

function getPaymentAnalyticsContext(
  cart: Cart,
  orderSummary: OrderSummary,
  sessionId?: string
): PaymentAnalyticsContext {
  const ticketCount = cart.items
    .filter((item) => item.kind !== 'workshop')
    .reduce((sum, item) => sum + item.quantity, 0);
  const workshopCount = cart.items
    .filter((item) => item.kind === 'workshop')
    .reduce((sum, item) => sum + item.quantity, 0);

  return {
    cart_item_count: cart.items.length,
    cart_total_amount: orderSummary.total,
    cart_currency: orderSummary.currency,
    cart_items: mapCartItemsToAnalytics(cart.items),
    stripe_session_id: sessionId,
    ticket_count: ticketCount,
    workshop_count: workshopCount,
    seat_count: ticketCount + workshopCount,
    has_discount: orderSummary.discount > 0,
    coupon_code: cart.couponCode,
    purchase_type: ticketCount > 0 && workshopCount > 0
      ? 'mixed'
      : workshopCount > 0
        ? 'workshop'
        : 'ticket',
  };
}
