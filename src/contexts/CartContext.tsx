/**
 * Cart Context with useReducer
 * Simplified state management for shopping cart with localStorage persistence
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect } from 'react';
import type { Cart, CartItem } from '@/types/cart';
import { useVoucherValidation } from '@/hooks/useVoucherValidation';

/**
 * Cart Actions
 */
type CartAction =
  | { type: 'ADD_ITEM'; payload: { item: Omit<CartItem, 'quantity'>; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { itemId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'APPLY_VOUCHER'; payload: { code: string; promotionCodeId: string; discountAmount: number } }
  | { type: 'REMOVE_VOUCHER' }
  | { type: 'CLEAR_CART' };

/**
 * Cart Reducer
 */
function cartReducer(state: Cart, action: CartAction): Cart {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { item, quantity } = action.payload;
      const existingItemIndex = state.items.findIndex((i) => i.id === item.id);

      let newItems: CartItem[];
      if (existingItemIndex >= 0) {
        // Update existing item quantity
        newItems = [...state.items];
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: newItems[existingItemIndex].quantity + quantity,
        };
      } else {
        // Add new item
        newItems = [...state.items, { ...item, quantity }];
      }

      // Recalculate totals
      const totalItems = newItems.reduce((sum, i) => sum + i.quantity, 0);
      const totalPrice = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

      return {
        ...state,
        items: newItems,
        totalItems,
        totalPrice,
        currency: item.currency,
      };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter((item) => item.id !== action.payload.itemId);
      const totalItems = newItems.reduce((sum, i) => sum + i.quantity, 0);
      const totalPrice = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

      return {
        ...state,
        items: newItems,
        totalItems,
        totalPrice,
      };
    }

    case 'UPDATE_QUANTITY': {
      const { itemId, quantity } = action.payload;
      
      if (quantity <= 0) {
        // Remove item if quantity is 0
        return cartReducer(state, { type: 'REMOVE_ITEM', payload: { itemId } });
      }

      const newItems = state.items.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      );

      const totalItems = newItems.reduce((sum, i) => sum + i.quantity, 0);
      const totalPrice = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

      return {
        ...state,
        items: newItems,
        totalItems,
        totalPrice,
      };
    }

    case 'APPLY_VOUCHER': {
      return {
        ...state,
        voucherCode: action.payload.code,
        promotionCodeId: action.payload.promotionCodeId,
        discountAmount: action.payload.discountAmount,
      };
    }

    case 'REMOVE_VOUCHER': {
      return {
        ...state,
        voucherCode: undefined,
        promotionCodeId: undefined,
        discountAmount: undefined,
      };
    }

    case 'CLEAR_CART': {
      return createEmptyCart();
    }

    default:
      return state;
  }
}

/**
 * Create empty cart
 */
function createEmptyCart(): Cart {
  return {
    items: [],
    totalItems: 0,
    totalPrice: 0,
    currency: 'CHF',
  };
}

/**
 * Cart context value
 */
interface CartContextValue {
  cart: Cart;
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  applyVoucher: (code: string) => Promise<{ success: boolean; error?: string }>;
  removeVoucher: () => void;
  clearCart: () => void;
  isInCart: (itemId: string) => boolean;
  getItemQuantity: (itemId: string) => number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

/**
 * Cart context
 */
const CartContext = createContext<CartContextValue | undefined>(undefined);

/**
 * Cart provider props
 */
export interface CartProviderProps {
  children: React.ReactNode;
}

/**
 * Cart provider component
 */
export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  // Initialize reducer with empty cart
  const [cart, dispatch] = useReducer(cartReducer, createEmptyCart());
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  
  // Ref to always have access to current cart without causing re-renders
  const cartRef = React.useRef<Cart>(cart);
  
  // Keep ref in sync with cart state
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // Voucher validation mutation
  const { mutateAsync: validateVoucher } = useVoucherValidation();

  /**
   * Add item to cart
   */
  const addToCart = useCallback((item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    dispatch({ type: 'ADD_ITEM', payload: { item, quantity } });
  }, []);

  /**
   * Remove item from cart
   */
  const removeFromCart = useCallback((itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { itemId } });
  }, []);

  /**
   * Update item quantity
   */
  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } });
  }, []);

  /**
   * Apply voucher code
   */
  const applyVoucher = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Use ref to access current cart without causing re-renders
      const currentCart = cartRef.current;
      
      // Extract price IDs from cart items for product validation
      const priceIds = currentCart.items.map((item) => item.priceId);

      if (priceIds.length === 0) {
        return { success: false, error: 'Your cart is empty' };
      }

      // Validate voucher with Stripe via API
      const result = await validateVoucher({
        code: code.trim(),
        cartTotal: currentCart.totalPrice,
        currency: currentCart.currency,
        priceIds,
      });

      if (!result.valid) {
        return { success: false, error: result.error || 'Invalid voucher code' };
      }

      // Calculate discount based on voucher type
      let discountAmount = 0;
      if (result.type === 'fixed' && result.amountOff) {
        discountAmount = result.amountOff;
      } else if (result.type === 'percentage' && result.percentOff) {
        discountAmount = (currentCart.totalPrice * result.percentOff) / 100;
      }

      // Apply voucher to cart
      dispatch({
        type: 'APPLY_VOUCHER',
        payload: {
          code: result.code || code.trim(),
          promotionCodeId: result.promotionCodeId || '',
          discountAmount,
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply voucher';
      return { success: false, error: errorMessage };
    }
  }, [validateVoucher]);

  /**
   * Remove voucher
   */
  const removeVoucher = useCallback(() => {
    dispatch({ type: 'REMOVE_VOUCHER' });
  }, []);

  /**
   * Clear entire cart
   */
  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  /**
   * Check if item is in cart
   */
  const isInCart = useCallback((itemId: string): boolean => {
    return cartRef.current.items.some((item) => item.id === itemId);
  }, []);

  /**
   * Get item quantity
   */
  const getItemQuantity = useCallback((itemId: string): number => {
    const item = cartRef.current.items.find((i) => i.id === itemId);
    return item?.quantity || 0;
  }, []);

  /**
   * Open cart drawer
   */
  const openCart = useCallback(() => {
    setIsCartOpen(true);
  }, []);

  /**
   * Close cart drawer
   */
  const closeCart = useCallback(() => {
    setIsCartOpen(false);
  }, []);

  /**
   * Toggle cart drawer
   */
  const toggleCart = useCallback(() => {
    setIsCartOpen((prev) => !prev);
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value: CartContextValue = useMemo(
    () => ({
      cart,
      addToCart,
      removeFromCart,
      updateItemQuantity,
      applyVoucher,
      removeVoucher,
      clearCart,
      isInCart,
      getItemQuantity,
      isCartOpen,
      openCart,
      closeCart,
      toggleCart,
    }),
    [
      cart,
      addToCart,
      removeFromCart,
      updateItemQuantity,
      applyVoucher,
      removeVoucher,
      clearCart,
      isInCart,
      getItemQuantity,
      isCartOpen,
      openCart,
      closeCart,
      toggleCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

/**
 * Hook to use cart context
 */
export const useCart = (): CartContextValue => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
