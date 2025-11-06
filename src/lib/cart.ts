/**
 * Cart utility functions
 */

import type { Cart, OrderSummary } from '@/types/cart';

/**
 * Calculate order summary with discounts
 * Note: VAT is already included in all prices (8.1% Swiss VAT)
 */
export const calculateOrderSummary = (cart: Cart): OrderSummary => {
  const subtotal = cart.totalPrice;
  const discount = cart.discountAmount || 0;
  const total = subtotal - discount;

  return {
    subtotal,
    discount,
    tax: 0, // VAT already included in prices
    total,
    currency: cart.currency,
  };
};

/**
 * Format price with currency
 */
export const formatPrice = (price: number, currency: string): string => {
  return new Intl.NumberFormat('en-CH', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

/**
 * Calculate discount amount from voucher
 */
export const calculateDiscount = (
  voucherType: 'percentage' | 'fixed',
  voucherValue: number,
  subtotal: number,
  maxDiscount?: number
): number => {
  let discount = 0;

  if (voucherType === 'percentage') {
    discount = (subtotal * voucherValue) / 100;
    if (maxDiscount && discount > maxDiscount) {
      discount = maxDiscount;
    }
  } else if (voucherType === 'fixed') {
    discount = Math.min(voucherValue, subtotal);
  }

  return discount;
};
