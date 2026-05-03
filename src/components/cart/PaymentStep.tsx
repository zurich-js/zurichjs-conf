/**
 * PaymentStep
 * Renders Stripe Custom Checkout (PaymentElement) inside the cart flow.
 * Uses the Checkout Session's client_secret in embedded mode, which
 * preserves the checkout.session.completed webhook while giving us
 * full control over the payment form UI and prefilled billing details.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckoutElementsProvider,
  PaymentElement,
  useCheckout,
} from '@stripe/react-stripe-js/checkout';
import { ChevronLeft, Lock } from 'lucide-react';
import { getStripePromise } from '@/lib/stripe/client-browser';
import { Button, Heading } from '@/components/atoms';

interface PaymentStepProps {
  clientSecret: string;
  sessionId?: string;
  totalAmount: string;
  currency: string;
  onBack: () => void;
}

export function PaymentStep({ clientSecret, totalAmount, currency, onBack }: PaymentStepProps) {
  const stripePromise = getStripePromise();

  return (
    <motion.div
      key="payment"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-2xl mx-auto">
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

        <div className="rounded-2xl bg-brand-gray-lightest p-5 sm:p-8">
          <CheckoutElementsProvider
            stripe={stripePromise}
            options={{ clientSecret }}
          >
            <PaymentForm totalAmount={totalAmount} currency={currency} />
          </CheckoutElementsProvider>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500 flex items-center justify-center gap-1">
          <Lock className="size-3" />
          Payments are securely processed by Stripe
        </p>
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
}: {
  totalAmount: string;
  currency: string;
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

    const result = await checkout.checkout.confirm();

    if (result.type === 'error') {
      setErrorMessage(result.error?.message ?? 'An unexpected error occurred.');
      setIsProcessing(false);
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
