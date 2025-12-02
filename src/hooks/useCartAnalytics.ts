/**
 * Cart Analytics Hook
 * Centralizes all cart-related analytics tracking
 * Provides type-safe tracking methods for cart events
 */

import { useCallback, useEffect, useRef } from 'react';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';
import type { Cart, CartItem } from '@/types/cart';

interface OrderSummary {
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
}

export type CartStep = 'review' | 'attendees' | 'upsells' | 'checkout';

/**
 * Maps cart items to analytics format
 */
const mapCartItemsToAnalytics = (items: CartItem[]) =>
  items.map((item) => ({
    type: item.title.includes('Workshop') ? ('workshop_voucher' as const) : ('ticket' as const),
    category: item.variant === 'member' ? 'standard' : item.variant,
    stage: 'general_admission' as const,
    quantity: item.quantity,
    price: item.price,
  }));

export interface UseCartAnalyticsReturn {
  /** Track when user reviews their cart */
  trackCartReviewed: () => void;
  /** Track when user starts checkout */
  trackCheckoutStarted: (email: string, company?: string) => void;
  /** Track step view changes */
  trackStepView: (step: CartStep) => void;
  /** Track workshop upsell views */
  trackWorkshopUpsellViewed: (bonusPercent: number, availableVouchers: number, currentStage: string) => void;
  /** Track workshop upsell skip */
  trackWorkshopUpsellSkipped: (bonusPercent: number) => void;
  /** Identify user for analytics */
  identifyUser: (email: string, userData: {
    firstName: string;
    lastName: string;
    company?: string;
    jobTitle?: string;
  }) => void;
}

interface UseCartAnalyticsOptions {
  cart: Cart;
  orderSummary: OrderSummary;
}

/**
 * Hook for centralized cart analytics
 * Provides memoized tracking functions to prevent unnecessary re-renders
 */
export function useCartAnalytics({ cart, orderSummary }: UseCartAnalyticsOptions): UseCartAnalyticsReturn {
  // Use refs to avoid stale closures while maintaining stable function references
  const cartRef = useRef(cart);
  const summaryRef = useRef(orderSummary);

  // Keep refs up to date
  useEffect(() => {
    cartRef.current = cart;
    summaryRef.current = orderSummary;
  }, [cart, orderSummary]);

  const trackCartReviewed = useCallback(() => {
    const { items } = cartRef.current;
    const summary = summaryRef.current;

    analytics.track('cart_reviewed', {
      cart_item_count: items.length,
      cart_total_amount: summary.total,
      cart_currency: summary.currency,
      cart_items: mapCartItemsToAnalytics(items),
    } as EventProperties<'cart_reviewed'>);
  }, []);

  const trackCheckoutStarted = useCallback((email: string, company?: string) => {
    const { items } = cartRef.current;
    const summary = summaryRef.current;

    analytics.track('checkout_started', {
      cart_item_count: items.length,
      cart_total_amount: summary.total,
      cart_currency: summary.currency,
      cart_items: mapCartItemsToAnalytics(items),
      email,
      company,
    } as EventProperties<'checkout_started'>);
  }, []);

  const trackStepView = useCallback((step: CartStep) => {
    const { items } = cartRef.current;
    const summary = summaryRef.current;

    analytics.track('cart_step_viewed', {
      step,
      cart_item_count: items.length,
      cart_total_amount: summary.total,
    } as EventProperties<'cart_step_viewed'>);
  }, []);

  const trackWorkshopUpsellViewed = useCallback(
    (bonusPercent: number, availableVouchers: number, currentStage: string) => {
      analytics.track('workshop_upsell_viewed', {
        bonus_percent: bonusPercent,
        available_vouchers: availableVouchers,
        current_stage: currentStage,
      } as EventProperties<'workshop_upsell_viewed'>);
    },
    []
  );

  const trackWorkshopUpsellSkipped = useCallback((bonusPercent: number) => {
    analytics.track('workshop_upsell_skipped', {
      bonus_percent: bonusPercent,
    } as EventProperties<'workshop_upsell_skipped'>);
  }, []);

  const identifyUser = useCallback(
    (
      email: string,
      userData: {
        firstName: string;
        lastName: string;
        company?: string;
        jobTitle?: string;
      }
    ) => {
      analytics.identify(email, {
        email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        name: `${userData.firstName} ${userData.lastName}`.trim(),
        company: userData.company || undefined,
        job_title: userData.jobTitle || undefined,
      });
    },
    []
  );

  return {
    trackCartReviewed,
    trackCheckoutStarted,
    trackStepView,
    trackWorkshopUpsellViewed,
    trackWorkshopUpsellSkipped,
    identifyUser,
  };
}
