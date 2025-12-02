/**
 * Cart Context - Simplified state management
 * 
 * Architecture:
 * - Pure cart operations in lib/cart-operations.ts
 * - useReducer for predictable state updates
 * - Analytics handled separately via event handlers
 * - URL encoding handled in navigateToCart
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

// ============================================================================
// Action Types
// ============================================================================

type CartAction =
  | { type: 'ADD_ITEM'; item: Omit<CartItem, 'quantity'>; quantity: number }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'UPDATE_QUANTITY'; itemId: string; quantity: number }
  | { type: 'APPLY_VOUCHER'; code: string; discountType: 'percentage' | 'fixed'; discountValue: number }
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
      return applyVoucherToCart(state, action.code, action.discountType, action.discountValue);
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
  const [cart, dispatch] = useReducer(cartReducer, initialCart ?? createEmptyCart());
  
  // Keep a ref for synchronous access (needed for navigateToCart)
  const cartRef = React.useRef(cart);
  React.useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // Voucher validation (uses TanStack Query)
  const { mutateAsync: validateVoucher } = useVoucherValidation();

  // ---- Actions ----

  const addToCart = useCallback((item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    dispatch({ type: 'ADD_ITEM', item, quantity });
    // Sync ref immediately for navigation
    cartRef.current = addItem(cartRef.current, item, quantity);
  }, []);

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
        trackVoucherEvent(code, false, result.error);
        return { success: false, error: result.error || 'Invalid promo code' };
      }

      // Determine discount type and value
      const discountType = result.type === 'fixed' ? 'fixed' as const : 'percentage' as const;
      const discountValue = result.type === 'fixed' ? result.amountOff! : result.percentOff!;

      dispatch({ type: 'APPLY_VOUCHER', code: code.trim(), discountType, discountValue });
      trackVoucherEvent(code, true);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply promo code';
      trackVoucherEvent(code, false, errorMessage);
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

function trackVoucherEvent(code: string, success: boolean, error?: string) {
  analytics.track('voucher_applied', {
    voucher_code: code.trim(),
    discount_amount: 0,
    discount_type: 'fixed',
    discount_value: 0,
    success,
    ...(error && { error_message: error }),
  } as EventProperties<'voucher_applied'>);
}
