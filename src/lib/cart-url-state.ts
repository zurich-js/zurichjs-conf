/**
 * Cart URL State Management with Obfuscation
 *
 * This module provides utilities for encoding/decoding cart state to/from URL parameters
 * with obfuscation to prevent easy manipulation and reduce URL length.
 */

import type { Cart, CartItem } from '@/types/cart';

/**
 * Minimal cart state for URL encoding
 *
 * We use abbreviated property names to reduce URL length and improve shareability.
 * This is intentional to keep URLs manageable, especially when multiple items are in cart.
 * We only store essential data and reconstruct derived values (totalItems, totalPrice) on decode.
 */
interface MinimalCartState {
  /** Cart items with only essential fields */
  items: Array<{
    /** Item ID */
    id: string;
    /** Item title */
    title: string;
    /** Price */
    price: number;
    /** Currency */
    currency: string;
    /** Quantity */
    quantity: number;
    /** Stripe Price ID */
    priceId: string;
    /** Ticket variant for styling (optional) */
    variant?: 'standard' | 'vip' | 'member';
  }>;
  /** Cart currency */
  currency: string;
  /** Voucher code (optional) */
  voucherCode?: string;
  /** Stripe Promotion code ID (optional) */
  promotionCodeId?: string;
  /** Discount amount from voucher (optional) */
  discountAmount?: number;
}

/**
 * Encode cart state to an obfuscated URL-safe string
 *
 * Process:
 * 1. Convert cart to minimal representation
 * 2. JSON stringify
 * 3. Encode to base64
 * 4. Apply simple character substitution for obfuscation
 * 5. Make URL-safe
 */
export function encodeCartState(cart: Cart): string {
  // If cart is empty, return empty string
  if (!cart.items.length) {
    return '';
  }

  try {
    // Convert to minimal representation (we omit derived values like totalItems and totalPrice)
    const minimal: MinimalCartState = {
      items: cart.items.map(item => ({
        id: item.id,
        title: item.title,
        price: item.price,
        currency: item.currency,
        quantity: item.quantity,
        priceId: item.priceId,
        ...(item.variant && { variant: item.variant }),
      })),
      currency: cart.currency,
      ...(cart.voucherCode && { voucherCode: cart.voucherCode }),
      ...(cart.promotionCodeId && { promotionCodeId: cart.promotionCodeId }),
      ...(cart.discountAmount !== undefined && { discountAmount: cart.discountAmount }),
    };

    // JSON stringify
    const json = JSON.stringify(minimal);

    // Encode to base64
    const base64 = Buffer.from(json).toString('base64');

    // Apply simple character substitution for obfuscation
    // This makes it harder to decode at a glance while keeping it URL-safe
    const obfuscated = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return obfuscated;
  } catch (error) {
    console.error('Failed to encode cart state:', error);
    return '';
  }
}

/**
 * Decode an obfuscated cart state string back to a Cart object
 *
 * Process:
 * 1. Reverse URL-safe encoding
 * 2. Reverse character substitution
 * 3. Decode from base64
 * 4. Parse JSON
 * 5. Reconstruct full cart state with derived values
 */
export function decodeCartState(encoded: string): Cart | null {
  // If empty string, return null
  if (!encoded || encoded.trim() === '') {
    return null;
  }

  try {
    // Reverse character substitution
    let base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }

    // Decode from base64
    const json = Buffer.from(base64, 'base64').toString('utf-8');

    // Parse JSON
    const minimal: MinimalCartState = JSON.parse(json);

    // Validate structure
    if (!minimal.items || !Array.isArray(minimal.items) || !minimal.currency) {
      console.error('Invalid cart state structure');
      return null;
    }

    // Reconstruct full cart with derived values
    const items: CartItem[] = minimal.items.map(item => ({
      id: item.id,
      title: item.title,
      price: item.price,
      currency: item.currency,
      quantity: item.quantity,
      priceId: item.priceId,
      ...(item.variant && { variant: item.variant }),
    }));

    // Calculate derived values
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Reconstruct full cart object
    const cart: Cart = {
      items,
      totalItems,
      totalPrice,
      currency: minimal.currency,
      ...(minimal.voucherCode && { voucherCode: minimal.voucherCode }),
      ...(minimal.promotionCodeId && { promotionCodeId: minimal.promotionCodeId }),
      ...(minimal.discountAmount !== undefined && { discountAmount: minimal.discountAmount }),
    };

    return cart;
  } catch (error) {
    console.error('Failed to decode cart state:', error);
    return null;
  }
}

/**
 * Create an empty cart object
 */
export function createEmptyCart(): Cart {
  return {
    items: [],
    totalItems: 0,
    totalPrice: 0,
    currency: 'CHF',
  };
}
