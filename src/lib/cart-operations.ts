/**
 * Cart Operations - Pure functions for cart manipulation
 * All cart calculations are derived, not stored
 */

import type { Cart, CartItem, OrderSummary } from '@/types/cart';
import { DEFAULT_CURRENCY, type SupportedCurrency } from '@/config/currency';

/**
 * Standing discount, in percent, that every VIP ticket grants on workshops.
 * Advertised on the VIP ticket as "20% discount to all workshops". When a VIP
 * ticket and a workshop share a cart, this is applied automatically to the
 * workshop line items — both for the client-side order summary below and for
 * the authoritative Stripe discount built in `create-checkout-session`.
 */
export const VIP_WORKSHOP_DISCOUNT_PERCENT = 20;

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
 * Whether the cart contains at least one VIP conference ticket.
 * Used to decide if the standing VIP workshop discount applies. This reads the
 * client-side `variant` for display only — checkout re-derives VIP eligibility
 * from the Stripe price server-side, so it can't be spoofed into a real charge.
 */
export function cartHasVipTicket(items: CartItem[]): boolean {
  return items.some((item) => item.kind !== 'workshop' && item.variant === 'vip');
}

/**
 * Derived VIP workshop perk: a standing 20% off all workshop line items, applied
 * automatically when a VIP ticket and one or more workshops share the cart.
 *
 * A manually-applied voucher takes precedence — Stripe allows only one discount
 * per checkout session, so we don't stack the two. When a voucher is present
 * this returns a zero discount and the manual voucher is used instead.
 */
export function getVipWorkshopDiscount(cart: Cart): {
  discount: number;
  applicablePriceIds: string[];
} {
  // Manual voucher wins — never stack on top of an explicit promo code.
  if (cart.couponCode) return { discount: 0, applicablePriceIds: [] };
  if (!cartHasVipTicket(cart.items)) return { discount: 0, applicablePriceIds: [] };

  const workshops = cart.items.filter((item) => item.kind === 'workshop');
  if (workshops.length === 0) return { discount: 0, applicablePriceIds: [] };

  const workshopSubtotal = getTotalPrice(workshops);
  return {
    discount: (workshopSubtotal * VIP_WORKSHOP_DISCOUNT_PERCENT) / 100,
    applicablePriceIds: workshops.map((item) => item.priceId),
  };
}

/**
 * Status of the VIP workshop perk for the current cart, used to drive accurate
 * UI messaging. Note the perk and a manual voucher can never both be charged in
 * one order — Stripe allows a single discount per checkout — so when a code is
 * present we only distinguish *why* the perk isn't added, not whether it could.
 *
 * - `null`              — no VIP ticket in the cart; perk is irrelevant.
 * - `add-workshop`      — VIP ticket but no workshop yet; perk available once added.
 * - `applied`           — VIP + workshop, no code; 20% is applied automatically.
 * - `covered-by-code`   — a manual code already discounts the workshops, so the
 *                         perk isn't layered on top (no loss to the buyer).
 * - `blocked-by-code`   — a manual code applies elsewhere (e.g. ticket-only) and
 *                         can't coexist with the perk; the workshop isn't discounted.
 */
export type VipWorkshopPerkStatus =
  | 'applied'
  | 'add-workshop'
  | 'covered-by-code'
  | 'blocked-by-code'
  | null;

export function getVipWorkshopPerkStatus(cart: Cart): VipWorkshopPerkStatus {
  if (!cartHasVipTicket(cart.items)) return null;

  const workshops = cart.items.filter((item) => item.kind === 'workshop');
  if (workshops.length === 0) return 'add-workshop';

  if (!cart.couponCode) return 'applied';

  // A manual code is present. It "covers" the workshops when it has no per-item
  // restriction (applies to everything) or its applicable price IDs intersect
  // the workshop line items. Otherwise it's discounting something else and is
  // merely blocking the perk from also applying.
  const workshopPriceIds = workshops.map((item) => item.priceId);
  const coversWorkshops =
    !cart.applicablePriceIds ||
    cart.applicablePriceIds.length === 0 ||
    workshopPriceIds.some((id) => cart.applicablePriceIds!.includes(id));

  return coversWorkshops ? 'covered-by-code' : 'blocked-by-code';
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
  const voucherDiscount = calculateDiscountAmount(discountableAmount, cart.discountType, cart.discountValue);
  // VIP workshop perk is mutually exclusive with a manual voucher (see helper).
  const vipWorkshopDiscount = getVipWorkshopDiscount(cart).discount;
  const discount = voucherDiscount + vipWorkshopDiscount;

  return {
    subtotal,
    discount,
    vipWorkshopDiscount,
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
  applicablePriceIds?: string[],
  promotionCodeId?: string
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
    promotionCodeId,
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
    promotionCodeId: undefined,
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
