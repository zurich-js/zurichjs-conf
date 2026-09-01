import { useMutation } from '@tanstack/react-query';
import { analytics } from '@/lib/analytics/client';
import { apiClient, ApiError } from '@/lib/api';
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
 *
 * Failures fire `checkout_session_failed` with the error code and requestId —
 * without it, a broken Stripe key looks identical to checkout abandonment in
 * the funnel. `apiClient` parses the `{ error, code, requestId }` body and
 * survives non-JSON gateway responses (an HTML 502 no longer surfaces as a
 * SyntaxError in place of the real failure).
 */
export const useCheckout = () => {
  return useMutation<
    CreateCheckoutSessionResponse,
    Error,
    CreateCheckoutSessionRequest
  >({
    mutationFn: async ({ cart, customerInfo }) =>
      apiClient.post<CreateCheckoutSessionResponse, CreateCheckoutSessionRequest>(
        '/api/create-checkout-session',
        { cart, customerInfo }
      ),
    onError: (error, { cart }) => {
      const apiError = error instanceof ApiError ? error : undefined;
      analytics.track('checkout_session_failed', {
        error_message: error.message,
        error_code: apiError?.code,
        request_id: apiError?.requestId,
        http_status: apiError?.statusCode,
        cart_total: cart.totalPrice,
        currency: cart.currency,
        seat_count: cart.totalItems,
      });
    },
  });
};
