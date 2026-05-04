import { useMutation } from '@tanstack/react-query';
import type { Cart } from '@/types/cart';
import type { CheckoutFormData } from '@/lib/validations/checkout';

interface CreateCheckoutSessionResponse {
  clientSecret: string;
  sessionId: string;
}

interface CreateCheckoutSessionRequest {
  cart: Cart;
  customerInfo: CheckoutFormData;
}

/**
 * Custom hook for creating a Stripe checkout session.
 * Returns clientSecret for embedded checkout rendering.
 */
export const useCheckout = () => {
  return useMutation<
    CreateCheckoutSessionResponse,
    Error,
    CreateCheckoutSessionRequest
  >({
    mutationFn: async ({ cart, customerInfo }) => {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cart,
          customerInfo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      return response.json();
    },
  });
};
