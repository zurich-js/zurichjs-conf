/**
 * Analytics Helper Functions
 *
 * Convenience functions for common analytics tracking scenarios.
 * These helpers make it easy to track events consistently across the app.
 */

import { analytics } from './client'
import type { TicketCategory, TicketStage } from '@/lib/types/database'

// ============================================================================
// Variant Mapping Utilities
// ============================================================================

/**
 * UI variant type used in cart and pricing components
 * 'member' represents the combined Student/Unemployed ticket in the UI
 */
export type UIVariant = 'standard' | 'vip' | 'member';

/**
 * Maps UI variant to analytics TicketCategory
 *
 * The UI uses 'member' as a combined variant for Student/Unemployed tickets,
 * but analytics tracks these as 'student' category.
 *
 * Valid categories: standard, student, unemployed, vip
 * - 'member' → 'student' (combined student/unemployed in UI)
 * - undefined → 'standard' (fallback)
 *
 * @param variant - The UI variant from cart item
 * @returns The corresponding TicketCategory for analytics
 */
export function mapVariantToCategory(variant: UIVariant | string | undefined): TicketCategory {
  if (variant === 'member') {
    return 'student';
  }
  if (variant === 'standard' || variant === 'student' || variant === 'unemployed' || variant === 'vip') {
    return variant;
  }
  // Fallback for undefined or unknown variants
  return 'standard';
}

/**
 * Maps an array of cart items to analytics format
 * Centralizes the cart item transformation logic for consistent analytics tracking
 *
 * @param items - Array of cart items with variant and other properties
 * @returns Array of items formatted for analytics events
 */
export function mapCartItemsToAnalytics(items: Array<{
  title: string;
  variant?: string;
  quantity: number;
  price: number;
}>) {
  return items.map((item) => ({
    type: item.title.includes('Workshop') ? ('workshop_voucher' as const) : ('ticket' as const),
    category: mapVariantToCategory(item.variant),
    stage: 'general_admission' as TicketStage,
    quantity: item.quantity,
    price: item.price,
  }));
}

// ============================================================================
// Client-side Helpers
// ============================================================================

/**
 * Track ticket added to cart
 */
export function trackTicketAddedToCart(params: {
  category: TicketCategory
  stage: TicketStage
  price: number
  quantity: number
  currency?: string
}) {
  analytics.track('ticket_added_to_cart', {
    ticket_category: params.category,
    ticket_stage: params.stage,
    ticket_price: params.price,
    ticket_count: params.quantity,
    currency: params.currency || 'CHF',
    quantity: params.quantity,
  })
}

/**
 * Track checkout started
 */
export function trackCheckoutStarted(params: {
  cartItemCount: number
  cartTotalAmount: number
  cartCurrency: string
  cartItems: Array<{
    type: 'ticket' | 'workshop_voucher'
    category?: TicketCategory
    stage?: TicketStage
    quantity: number
    price: number
  }>
  email?: string
  firstName?: string
  lastName?: string
}) {
  analytics.track('checkout_started', {
    cart_item_count: params.cartItemCount,
    cart_total_amount: params.cartTotalAmount,
    cart_currency: params.cartCurrency,
    cart_items: params.cartItems,
    email: params.email,
    first_name: params.firstName,
    last_name: params.lastName,
  })
}

/**
 * Track form error
 */
export function trackFormError(params: {
  formName: string
  formField?: string
  errorMessage: string
  errorType?: 'validation' | 'network' | 'payment' | 'auth' | 'system' | 'unknown'
}) {
  analytics.track('form_error', {
    form_name: params.formName,
    form_field: params.formField,
    error_message: params.errorMessage,
    error_type: params.errorType || 'validation',
    error_severity: 'low',
  })
}

/**
 * Track button click
 */
export function trackButtonClick(params: {
  buttonText: string
  buttonId?: string
  buttonLocation: string
  buttonAction: string
}) {
  analytics.track('button_clicked', {
    button_text: params.buttonText,
    button_id: params.buttonId,
    button_location: params.buttonLocation,
    button_action: params.buttonAction,
  })
}

/**
 * Track workshop viewed
 */
export function trackWorkshopViewed(params: {
  workshopId: string
  workshopTitle: string
  workshopInstructor?: string
  workshopCapacity?: number
}) {
  analytics.track('workshop_viewed', {
    workshop_id: params.workshopId,
    workshop_title: params.workshopTitle,
    workshop_instructor: params.workshopInstructor,
    workshop_capacity: params.workshopCapacity,
  })
}

