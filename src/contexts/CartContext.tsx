/**
 * Cart Context - Simplified state management
 *
 * Architecture:
 * - Pure cart operations in lib/cart-operations.ts
 * - useReducer for predictable state updates
 * - Analytics handled separately via event handlers
 * - URL encoding handled in navigateToCart
 * - Currency consistency enforced via CurrencyContext
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import type { Cart, CartItem } from '@/types/cart';
import {
  createEmptyCart,
  addItem,
  removeItem,
  updateQuantity,
  applyVoucher as applyVoucherToCart,
  removeVoucher as removeVoucherFromCart,
} from '@/lib/cart-operations';
import { encodeCartState } from '@/lib/cart-url-state';
import { useVoucherValidation } from '@/hooks/useVoucherValidation';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';
import { useCurrency } from './CurrencyContext';

// ============================================================================
// Action Types
// ============================================================================

type CartAction =
  | { type: 'ADD_ITEM'; item: Omit<CartItem, 'quantity'>; quantity: number }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'UPDATE_QUANTITY'; itemId: string; quantity: number }
  | { type: 'APPLY_VOUCHER'; code: string; discountType: 'percentage' | 'fixed'; discountValue: number; applicablePriceIds?: string[] }
  | { type: 'REMOVE_VOUCHER' }
  | { type: 'CLEAR_CART' }
  | { type: 'REPLACE_CART'; cart: Cart };

// ============================================================================
// Reducer
// ============================================================================

function cartReducer(state: Cart, action: CartAction): Cart {
  switch (action.type) {
    case 'ADD_ITEM':
      return addItem(state, action.item, action.quantity);
    case 'REMOVE_ITEM':
      return removeItem(state, action.itemId);
    case 'UPDATE_QUANTITY':
      return updateQuantity(state, action.itemId, action.quantity);
    case 'APPLY_VOUCHER':
      return applyVoucherToCart(state, action.code, action.discountType, action.discountValue, action.applicablePriceIds);
    case 'REMOVE_VOUCHER':
      return removeVoucherFromCart(state);
    case 'CLEAR_CART':
      return createEmptyCart();
    case 'REPLACE_CART':
      return action.cart;
    default:
      return state;
  }
}

// ============================================================================
// Context Types
// ============================================================================

interface CartContextValue {
  cart: Cart;
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  applyVoucher: (code: string) => Promise<{ success: boolean; error?: string }>;
  removeVoucher: () => void;
  clearCart: () => void;
  replaceCart: (newCart: Cart) => void;
  isInCart: (itemId: string) => boolean;
  getItemQuantity: (itemId: string) => number;
  navigateToCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

export interface CartProviderProps {
  children: React.ReactNode;
  /** Initial cart state from server-side props (for SSR) */
  initialCart?: Cart;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children, initialCart }) => {
  // Get currency from context (detected server-side via geo-location)
  const { currency } = useCurrency();

  // Initialize cart with proper currency
  // If initialCart is provided, use it; otherwise create empty cart with detected currency
  const [cart, dispatch] = useReducer(
    cartReducer,
    initialCart ?? createEmptyCart(currency)
  );

  // Keep a ref for synchronous access (needed for navigateToCart)
  const cartRef = React.useRef(cart);
  React.useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // Voucher validation (uses TanStack Query)
  const { mutateAsync: validateVoucher } = useVoucherValidation();

  // ---- Actions ----

  const addToCart = useCallback((item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    // Validate currency consistency
    if (item.currency !== currency) {
      console.warn(
        `[Cart] Currency mismatch: item currency "${item.currency}" differs from cart currency "${currency}". ` +
        'This may indicate a geo-detection inconsistency.'
      );
    }
    dispatch({ type: 'ADD_ITEM', item, quantity });
    // Sync ref immediately for navigation
    cartRef.current = addItem(cartRef.current, item, quantity);
  }, [currency]);

  const removeFromCart = useCallback((itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', itemId });
  }, []);

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', itemId, quantity });
  }, []);

  const applyVoucher = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    const currentCart = cartRef.current;
    const priceIds = currentCart.items.map((item) => item.priceId);

    if (priceIds.length === 0) {
      return { success: false, error: 'No tickets selected' };
    }

    try {
      const result = await validateVoucher({
        code: code.trim(),
        cartTotal: currentCart.totalPrice,
        currency: currentCart.currency,
        priceIds,
      });

      if (!result.valid) {
        trackVoucherEvent({
          code,
          success: false,
          error: result.error,
          cartPriceIds: priceIds,
        });
        return { success: false, error: result.error || 'Invalid promo code' };
      }

      // Determine discount type and value
      const discountType = result.type === 'fixed' ? 'fixed' as const : 'percentage' as const;
      const discountValue = result.type === 'fixed' ? result.amountOff! : result.percentOff!;

      dispatch({
        type: 'APPLY_VOUCHER',
        code: result.couponId!,
        discountType,
        discountValue,
        applicablePriceIds: result.applicablePriceIds,
      });

      trackVoucherEvent({
        code,
        success: true,
        discountType,
        discountValue,
        applicablePriceIds: result.applicablePriceIds,
        cartPriceIds: priceIds,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply promo code';
      trackVoucherEvent({
        code,
        success: false,
        error: errorMessage,
        cartPriceIds: priceIds,
      });
      return { success: false, error: errorMessage };
    }
  }, [validateVoucher]);

  const removeVoucher = useCallback(() => {
    const currentCode = cartRef.current.couponCode;
    if (currentCode) {
      analytics.track('voucher_removed', {
        voucher_code: currentCode,
        discount_amount: cartRef.current.discountAmount || 0,
      } as EventProperties<'voucher_removed'>);
    }
    dispatch({ type: 'REMOVE_VOUCHER' });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  const replaceCart = useCallback((newCart: Cart) => {
    dispatch({ type: 'REPLACE_CART', cart: newCart });
    cartRef.current = newCart;
  }, []);

  // ---- Selectors ----

  const isInCart = useCallback((itemId: string): boolean => {
    return cart.items.some((item) => item.id === itemId);
  }, [cart.items]);

  const getItemQuantity = useCallback((itemId: string): number => {
    const item = cart.items.find((i) => i.id === itemId);
    return item?.quantity || 0;
  }, [cart.items]);

  // ---- Navigation ----

  const navigateToCart = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const currentCart = cartRef.current;
    if (currentCart.items.length > 0) {
      const encoded = encodeCartState(currentCart);
      window.location.href = `/cart?cart=${encoded}`;
    } else {
      window.location.href = '/cart';
    }
  }, []);

  // ---- Context Value ----

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      addToCart,
      removeFromCart,
      updateItemQuantity,
      applyVoucher,
      removeVoucher,
      clearCart,
      replaceCart,
      isInCart,
      getItemQuantity,
      navigateToCart,
    }),
    [cart, addToCart, removeFromCart, updateItemQuantity, applyVoucher, removeVoucher, clearCart, replaceCart, isInCart, getItemQuantity, navigateToCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// ============================================================================
// Hook
// ============================================================================

export const useCart = (): CartContextValue => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// ============================================================================
// Analytics Helper
// ============================================================================

interface VoucherTrackingData {
  code: string;
  success: boolean;
  error?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  applicablePriceIds?: string[];
  cartPriceIds?: string[];
}

function trackVoucherEvent(data: VoucherTrackingData) {
  const isPartialDiscount = data.applicablePriceIds &&
    data.cartPriceIds &&
    data.applicablePriceIds.length < data.cartPriceIds.length;

  console.log('[Cart] Voucher applied:', {
    code: data.code,
    success: data.success,
    discountType: data.discountType,
    discountValue: data.discountValue,
    applicablePriceIds: data.applicablePriceIds,
    cartPriceIds: data.cartPriceIds,
    isPartialDiscount,
    error: data.error,
  });

  analytics.track('voucher_applied', {
    voucher_code: data.code.trim(),
    discount_amount: 0,
    discount_type: data.discountType || 'fixed',
    discount_value: data.discountValue || 0,
    success: data.success,
    is_partial_discount: isPartialDiscount,
    applicable_items_count: data.applicablePriceIds?.length,
    cart_items_count: data.cartPriceIds?.length,
    ...(data.error && { error_message: data.error }),
  } as EventProperties<'voucher_applied'>);
}
