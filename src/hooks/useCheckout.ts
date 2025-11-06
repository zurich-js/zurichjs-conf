import { useMutation } from '@tanstack/react-query';
import type { Cart } from '@/types/cart';
import type { CheckoutFormData } from '@/lib/validations/checkout';

interface CreateCheckoutSessionResponse {
  url: string;
  sessionId: string;
}

interface CreateCheckoutSessionRequest {
  cart: Cart;
  customerInfo: CheckoutFormData;
}

/**
 * Custom hook for creating a Stripe checkout session
 * Uses TanStack Query for optimistic updates and error handling
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
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
};
