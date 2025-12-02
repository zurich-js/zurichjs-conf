/**
 * Cart utility functions
 * Re-exports from cart-operations.ts for backward compatibility
 */

import { getOrderSummary, formatPrice, calculateDiscountAmount } from './cart-operations';

// Re-export with original names for backward compatibility
export { formatPrice };
export const calculateOrderSummary = getOrderSummary;

/**
 * Calculate discount amount from voucher (legacy API)
 */
export const calculateDiscount = (
  voucherType: 'percentage' | 'fixed',
  voucherValue: number,
  subtotal: number,
  maxDiscount?: number
): number => {
  let discount = calculateDiscountAmount(subtotal, voucherType, voucherValue);
  
  // Handle maxDiscount for percentage (legacy behavior)
  if (voucherType === 'percentage' && maxDiscount && discount > maxDiscount) {
    discount = maxDiscount;
  }
  
  return discount;
};
