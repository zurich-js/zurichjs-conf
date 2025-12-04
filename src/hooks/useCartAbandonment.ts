/**
 * useCartAbandonment Hook
 * 
 * Manages cart abandonment tracking across multiple trigger points.
 * Tracks when users leave the checkout flow without completing purchase.
 * 
 * @example
 * ```tsx
 * const { trackAbandonment } = useCartAbandonment({
 *   enabled: !isCartEmpty,
 *   currentStep: 'checkout',
 *   cartData: {
 *     items: cart.items,
 *     total: orderSummary.total,
 *     currency: orderSummary.currency,
 *   },
 *   userEmail: capturedEmail,
 *   fieldTrackingStats: getTrackingStats(),
 * });
 * ```
 */

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';
import { mapCartItemsToAnalytics } from '@/lib/analytics/helpers';

type CartStep = 'review' | 'attendees' | 'upsells' | 'checkout';

interface CartItem {
  title: string;
  variant?: string;
  quantity: number;
  price: number;
}

interface UseCartAbandonmentOptions {
  /**
   * Whether abandonment tracking is enabled
   * Typically false when cart is empty or checkout is complete
   */
  enabled: boolean;

  /**
   * Current step in the checkout flow
   */
  currentStep: CartStep;

  /**
   * Cart data for tracking
   */
  cartData: {
    items: CartItem[];
    total: number;
    currency: string;
  };

  /**
   * Captured user email (if available)
   */
  userEmail?: string | null;

  /**
   * Optional field tracking statistics
   */
  fieldTrackingStats?: {
    fields_touched?: string[];
    fields_completed?: string[];
    last_field_interacted?: string;
    form_completion_percent?: number;
  };

  /**
   * Optional callback when abandonment is tracked
   */
  onAbandonment?: (data: EventProperties<'checkout_abandoned'>) => void;
}

/**
 * Custom hook for tracking cart abandonment
 * Monitors page visibility, route changes, and unload events
 */
export const useCartAbandonment = (options: UseCartAbandonmentOptions) => {
  const {
    enabled,
    currentStep,
    cartData,
    userEmail,
    fieldTrackingStats,
    onAbandonment,
  } = options;

  const router = useRouter();
  const sessionStartTime = useRef<number>(Date.now());
  const hasTrackedAbandonment = useRef<boolean>(false);

  /**
   * Format cart items for analytics using the centralized utility
   */
  const formatCartItems = useCallback((items: CartItem[]) => {
    return mapCartItemsToAnalytics(items);
  }, []);

  /**
   * Track abandonment event
   * Prevents duplicate tracking with hasTrackedAbandonment ref
   */
  const trackAbandonment = useCallback(() => {
    // Prevent duplicate abandonment events in the same session
    if (!enabled || hasTrackedAbandonment.current) {
      return;
    }

    hasTrackedAbandonment.current = true;

    const timeSpent = (Date.now() - sessionStartTime.current) / 1000;
    const formattedItems = formatCartItems(cartData.items);

    const abandonmentData: EventProperties<'checkout_abandoned'> = {
      abandonment_stage: currentStep,
      time_spent_seconds: timeSpent,
      cart_item_count: cartData.items.length,
      cart_total_amount: cartData.total,
      cart_currency: cartData.currency,
      cart_items: formattedItems,
      email: userEmail || undefined,
      ...fieldTrackingStats,
    };

    analytics.track('checkout_abandoned', abandonmentData);

    // Call optional callback
    if (onAbandonment) {
      onAbandonment(abandonmentData);
    }
  }, [
    enabled,
    currentStep,
    cartData,
    userEmail,
    fieldTrackingStats,
    formatCartItems,
    onAbandonment,
  ]);

  /**
   * Reset abandonment tracking flag
   * Call this when user returns to cart or completes checkout
   */
  const resetAbandonment = useCallback(() => {
    hasTrackedAbandonment.current = false;
  }, []);

  /**
   * Set up abandonment tracking listeners
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    /**
     * Track abandonment when page visibility changes (tab switch, minimize)
     */
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        trackAbandonment();
      }
    };

    /**
     * Track abandonment on page unload (close tab, navigate away)
     * Note: Some browsers may not reliably fire this event
     */
    const handleBeforeUnload = () => {
      trackAbandonment();
    };

    /**
     * Track abandonment on route change (SPA navigation)
     * Only triggers when navigating to a different page, not for query param updates
     */
    const handleRouteChange = (url: string) => {
      const newPath = url.split('?')[0];
      if (newPath !== router.pathname) {
        trackAbandonment();
      }
    };

    // Register event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    router.events.on('routeChangeStart', handleRouteChange);

    // Cleanup listeners on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [enabled, trackAbandonment, router.events]);

  return {
    /**
     * Manually trigger abandonment tracking
     */
    trackAbandonment,

    /**
     * Reset abandonment flag (e.g., when user returns or completes checkout)
     */
    resetAbandonment,
  };
};

