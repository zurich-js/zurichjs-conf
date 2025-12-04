/**
 * useCartAbandonmentEmail Hook
 *
 * Mutation hook for scheduling cart abandonment recovery emails.
 * Uses TanStack Query for request handling.
 */

import { useMutation } from '@tanstack/react-query';
import type { CartItem } from '@/types/cart';

/** Minimal cart item data needed for the abandonment email */
type EmailCartItem = Pick<CartItem, 'title' | 'quantity' | 'price' | 'currency'>;

interface ScheduleAbandonmentEmailRequest {
  email: string;
  firstName?: string;
  cartItems: EmailCartItem[];
  cartTotal: number;
  currency: string;
  /** Encoded cart state to restore full cart on recovery */
  encodedCartState?: string;
}

interface ScheduleAbandonmentEmailResponse {
  success: boolean;
  message?: string;
  error?: string;
  emailId?: string;
  scheduledFor?: string;
}

/**
 * Hook for scheduling cart abandonment recovery emails
 *
 * @example
 * ```tsx
 * const { mutate: scheduleAbandonmentEmail } = useCartAbandonmentEmail();
 *
 * scheduleAbandonmentEmail({
 *   email: 'user@example.com',
 *   firstName: 'John',
 *   cartItems: cart.items.map(({ title, quantity, price, currency }) => ({
 *     title, quantity, price, currency
 *   })),
 *   cartTotal: 199,
 *   currency: 'CHF',
 *   encodedCartState: encodeCartState(cart), // Full cart for recovery URL
 * });
 * ```
 */
export const useCartAbandonmentEmail = () => {
  return useMutation<
    ScheduleAbandonmentEmailResponse,
    Error,
    ScheduleAbandonmentEmailRequest
  >({
    mutationFn: async (data) => {
      const response = await fetch('/api/cart/abandoned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        // Use keepalive to ensure request completes even if page unloads
        keepalive: true,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to schedule abandonment email');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[CartAbandonmentEmail] Scheduled:', data);
      }
    },
    onError: (error) => {
      // Silently fail - abandonment emails are non-critical
      if (process.env.NODE_ENV === 'development') {
        console.error('[CartAbandonmentEmail] Failed:', error.message);
      }
    },
  });
};
