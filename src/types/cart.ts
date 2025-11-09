/**
 * Cart-related TypeScript types
 */

// Re-export CheckoutFormData from validation schema to maintain single source of truth
export type { CheckoutFormData } from '@/lib/validations/checkout';

/**
 * Cart item representing a ticket in the cart
 */
export interface CartItem {
  /**
   * Unique identifier for the ticket type
   */
  id: string;
  /**
   * Ticket title (e.g., "Standard", "VIP")
   */
  title: string;
  /**
   * Price in base currency units (not cents)
   */
  price: number;
  /**
   * Currency code
   */
  currency: string;
  /**
   * Quantity of this ticket type
   */
  quantity: number;
  /**
   * Stripe price ID
   */
  priceId: string;
  /**
   * Ticket variant for styling
   */
  variant?: 'standard' | 'vip' | 'member';
}

/**
 * Cart state
 */
export interface Cart {
  /**
   * Array of items in the cart
   */
  items: CartItem[];
  /**
   * Total number of items (sum of quantities)
   */
  totalItems: number;
  /**
   * Total price (sum of all item prices * quantities)
   */
  totalPrice: number;
  /**
   * Currency code
   */
  currency: string;
  /**
   * Applied coupon code (Stripe coupon ID)
   */
  couponCode?: string;
  /**
   * User-entered voucher code
   */
  voucherCode?: string;
  /**
   * Stripe promotion code ID
   */
  promotionCodeId?: string;
  /**
   * Discount amount from coupon
   */
  discountAmount?: number;
  /**
   * Discount type (percentage or fixed amount)
   */
  discountType?: 'percentage' | 'fixed';
  /**
   * Original discount value (percentage number or fixed amount)
   */
  discountValue?: number;
}

/**
 * Voucher/discount code
 */
export interface Voucher {
  /**
   * Voucher code
   */
  code: string;
  /**
   * Discount type
   */
  type: 'percentage' | 'fixed';
  /**
   * Discount value (percentage or fixed amount)
   */
  value: number;
  /**
   * Minimum purchase amount required
   */
  minPurchase?: number;
  /**
   * Maximum discount amount (for percentage discounts)
   */
  maxDiscount?: number;
  /**
   * Whether the voucher is valid
   */
  valid: boolean;
  /**
   * Error message if invalid
   */
  error?: string;
}

/**
 * Order summary for display
 */
export interface OrderSummary {
  /**
   * Subtotal before discounts
   */
  subtotal: number;
  /**
   * Discount amount
   */
  discount: number;
  /**
   * Tax amount (if applicable)
   */
  tax: number;
  /**
   * Final total
   */
  total: number;
  /**
   * Currency code
   */
  currency: string;
}

