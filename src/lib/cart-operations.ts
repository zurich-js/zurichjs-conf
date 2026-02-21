/**
 * Cart Operations - Pure functions for cart manipulation
 * All cart calculations are derived, not stored
 */

import type { Cart, CartItem, OrderSummary } from '@/types/cart';
import { DEFAULT_CURRENCY, type SupportedCurrency } from '@/config/currency';

// ============================================================================
// Cart Creation
// ============================================================================

/**
 * Create an empty cart with the specified currency
 * @param currency - Currency for the cart (defaults to CHF)
 */
export function createEmptyCart(currency: SupportedCurrency = DEFAULT_CURRENCY): Cart {
  return {
    items: [],
    totalItems: 0,
    totalPrice: 0,
    currency,
  };
}

// ============================================================================
// Derived Calculations (computed on demand, not stored)
// ============================================================================

/**
 * Calculate total number of items in cart
 */
export function getTotalItems(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Calculate total price of cart
 */
export function getTotalPrice(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Calculate total price of items that are eligible for a discount
 * @param items - Cart items
 * @param applicablePriceIds - Price IDs the coupon applies to (undefined = all items)
 */
export function getDiscountableSubtotal(items: CartItem[], applicablePriceIds?: string[]): number {
  // If no restrictions, all items are discountable
  if (!applicablePriceIds || applicablePriceIds.length === 0) {
    return getTotalPrice(items);
  }

  // Only sum items whose priceId is in the applicable list
  return items
    .filter((item) => applicablePriceIds.includes(item.priceId))
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Calculate discount amount based on type and value
 */
export function calculateDiscountAmount(
  totalPrice: number,
  discountType?: 'percentage' | 'fixed',
  discountValue?: number
): number {
  if (!discountType || !discountValue) return 0;
  
  if (discountType === 'fixed') {
    return Math.min(discountValue, totalPrice);
  }
  return (totalPrice * discountValue) / 100;
}

/**
 * Calculate complete order summary from cart
 * All values are derived, nothing stored
 * Discount is only applied to eligible items based on applicablePriceIds
 */
export function getOrderSummary(cart: Cart): OrderSummary {
  const subtotal = getTotalPrice(cart.items);
  // Calculate discount based only on items the coupon applies to
  const discountableAmount = getDiscountableSubtotal(cart.items, cart.applicablePriceIds);
  const discount = calculateDiscountAmount(discountableAmount, cart.discountType, cart.discountValue);

  return {
    subtotal,
    discount,
    tax: 0, // VAT already included in Swiss prices
    total: subtotal - discount,
    currency: cart.currency,
  };
}

// ============================================================================
// Cart Item Operations (pure functions returning new cart)
// ============================================================================

/**
 * Add item to cart (idempotent — no-op if item already exists)
 * Quantity changes are only allowed via updateQuantity in the cart page.
 */
export function addItem(
  cart: Cart,
  item: Omit<CartItem, 'quantity'>,
  quantity: number = 1
): Cart {
  const existingIndex = cart.items.findIndex((i) => i.id === item.id);

  if (existingIndex >= 0) {
    return cart;
  }

  const newItems = [...cart.items, { ...item, quantity }];
  return rebuildCart(cart, newItems, item.currency);
}

/**
 * Remove item from cart
 */
export function removeItem(cart: Cart, itemId: string): Cart {
  const newItems = cart.items.filter((item) => item.id !== itemId);
  return rebuildCart(cart, newItems);
}

/**
 * Update item quantity (removes if quantity <= 0)
 */
export function updateQuantity(cart: Cart, itemId: string, quantity: number): Cart {
  if (quantity <= 0) {
    return removeItem(cart, itemId);
  }
  
  const newItems = cart.items.map((item) =>
    item.id === itemId ? { ...item, quantity } : item
  );
  return rebuildCart(cart, newItems);
}

// ============================================================================
// Voucher Operations
// ============================================================================

/**
 * Apply voucher to cart
 * @param applicablePriceIds - Price IDs the coupon applies to (undefined = all items)
 */
export function applyVoucher(
  cart: Cart,
  couponCode: string,
  discountType: 'percentage' | 'fixed',
  discountValue: number,
  applicablePriceIds?: string[]
): Cart {
  // Calculate discount based only on applicable items
  const discountableAmount = getDiscountableSubtotal(cart.items, applicablePriceIds);
  const discountAmount = calculateDiscountAmount(discountableAmount, discountType, discountValue);

  return {
    ...cart,
    couponCode,
    discountAmount,
    discountType,
    discountValue,
    applicablePriceIds,
  };
}

/**
 * Remove voucher from cart
 */
export function removeVoucher(cart: Cart): Cart {
  return {
    ...cart,
    couponCode: undefined,
    discountAmount: undefined,
    discountType: undefined,
    discountValue: undefined,
    applicablePriceIds: undefined,
  };
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Rebuild cart with new items, recalculating totals and discount
 */
function rebuildCart(cart: Cart, newItems: CartItem[], currency?: string): Cart {
  const totalItems = getTotalItems(newItems);
  const totalPrice = getTotalPrice(newItems);
  // Recalculate discount based on applicable items only
  const discountableAmount = getDiscountableSubtotal(newItems, cart.applicablePriceIds);
  const discountAmount = calculateDiscountAmount(discountableAmount, cart.discountType, cart.discountValue);

  return {
    ...cart,
    items: newItems,
    totalItems,
    totalPrice,
    currency: currency ?? cart.currency,
    ...(cart.discountType && { discountAmount }),
  };
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format price with currency
 */
export function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('en-CH', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

