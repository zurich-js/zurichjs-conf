/**
 * Cart Context with localStorage persistence
 * Simplified state management for shopping cart with localStorage persistence
 * URL state sync is handled separately on the cart page
 */

import React, { createContext, useContext, useCallback, useMemo, useEffect, useState } from 'react';
import type { Cart, CartItem } from '@/types/cart';
import { useVoucherValidation } from '@/hooks/useVoucherValidation';

/**
 * Cart manipulation helpers
 * These are pure functions that return new cart states
 */

/**
 * Add item to cart
 */
function addItemToCart(cart: Cart, item: Omit<CartItem, 'quantity'>, quantity: number): Cart {
  const existingItemIndex = cart.items.findIndex((i) => i.id === item.id);

  let newItems: CartItem[];
  if (existingItemIndex >= 0) {
    // Update existing item quantity
    newItems = [...cart.items];
    newItems[existingItemIndex] = {
      ...newItems[existingItemIndex],
      quantity: newItems[existingItemIndex].quantity + quantity,
    };
  } else {
    // Add new item
    newItems = [...cart.items, { ...item, quantity }];
  }

  // Recalculate totals
  const totalItems = newItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return {
    ...cart,
    items: newItems,
    totalItems,
    totalPrice,
    currency: item.currency,
  };
}

/**
 * Remove item from cart
 */
function removeItemFromCart(cart: Cart, itemId: string): Cart {
  const newItems = cart.items.filter((item) => item.id !== itemId);
  const totalItems = newItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return {
    ...cart,
    items: newItems,
    totalItems,
    totalPrice,
  };
}

/**
 * Update item quantity in cart
 */
function updateItemQuantityInCart(cart: Cart, itemId: string, quantity: number): Cart {
  if (quantity <= 0) {
    // Remove item if quantity is 0
    return removeItemFromCart(cart, itemId);
  }

  const newItems = cart.items.map((item) =>
    item.id === itemId ? { ...item, quantity } : item
  );

  const totalItems = newItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return {
    ...cart,
    items: newItems,
    totalItems,
    totalPrice,
  };
}

/**
 * Apply voucher to cart
 */
function applyVoucherToCart(
  cart: Cart,
  code: string,
  promotionCodeId: string,
  discountAmount: number
): Cart {
  return {
    ...cart,
    voucherCode: code,
    promotionCodeId,
    discountAmount,
  };
}

/**
 * Remove voucher from cart
 */
function removeVoucherFromCart(cart: Cart): Cart {
  return {
    ...cart,
    voucherCode: undefined,
    promotionCodeId: undefined,
    discountAmount: undefined,
  };
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
 * Load cart from localStorage
 */
function loadCartFromStorage(): Cart {
  if (typeof window === 'undefined') {
    return createEmptyCart();
  }

  try {
    const storedCart = localStorage.getItem('zurichjs-cart');
    if (storedCart) {
      const parsed = JSON.parse(storedCart);
      // Validate the structure
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
        return parsed as Cart;
      }
    }
  } catch (error) {
    console.error('Failed to load cart from localStorage:', error);
  }

  return createEmptyCart();
}

/**
 * Save cart to localStorage
 */
function saveCartToStorage(cart: Cart): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem('zurichjs-cart', JSON.stringify(cart));
  } catch (error) {
    console.error('Failed to save cart to localStorage:', error);
  }
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
  navigateToCart: () => void;
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
  // Always start with empty cart to avoid hydration mismatch
  const [cart, setCart] = useState<Cart>(createEmptyCart());
  const [isHydrated, setIsHydrated] = useState(false);

  // Ref to always have access to current cart without causing re-renders
  const cartRef = React.useRef<Cart>(cart);

  // Keep ref in sync with cart state
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // Load cart from localStorage after mount (client-only)
  useEffect(() => {
    const storedCart = loadCartFromStorage();
    if (storedCart.items.length > 0) {
      setCart(storedCart);
    }
    setIsHydrated(true);
  }, []);

  // Persist cart to localStorage whenever it changes (but only after hydration)
  useEffect(() => {
    if (isHydrated) {
      saveCartToStorage(cart);
    }
  }, [cart, isHydrated]);

  // Voucher validation mutation
  const { mutateAsync: validateVoucher } = useVoucherValidation();

  /**
   * Add item to cart
   */
  const addToCart = useCallback((item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    setCart((currentCart) => addItemToCart(currentCart, item, quantity));
  }, []);

  /**
   * Remove item from cart
   */
  const removeFromCart = useCallback((itemId: string) => {
    setCart((currentCart) => removeItemFromCart(currentCart, itemId));
  }, []);

  /**
   * Update item quantity
   */
  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    setCart((currentCart) => updateItemQuantityInCart(currentCart, itemId, quantity));
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
        return { success: false, error: 'No tickets selected' };
      }

      // Validate voucher with Stripe via API
      const result = await validateVoucher({
        code: code.trim(),
        cartTotal: currentCart.totalPrice,
        currency: currentCart.currency,
        priceIds,
      });

      if (!result.valid) {
        return { success: false, error: result.error || 'Invalid promo code' };
      }

      // Calculate discount based on voucher type
      let discountAmount = 0;
      if (result.type === 'fixed' && result.amountOff) {
        discountAmount = result.amountOff;
      } else if (result.type === 'percentage' && result.percentOff) {
        discountAmount = (currentCart.totalPrice * result.percentOff) / 100;
      }

      // Apply voucher to cart
      setCart((currentCart) =>
        applyVoucherToCart(
          currentCart,
          result.code || code.trim(),
          result.promotionCodeId || '',
          discountAmount
        )
      );

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply promo code';
      return { success: false, error: errorMessage };
    }
  }, [validateVoucher]);

  /**
   * Remove voucher
   */
  const removeVoucher = useCallback(() => {
    setCart((currentCart) => removeVoucherFromCart(currentCart));
  }, []);

  /**
   * Clear entire cart
   */
  const clearCart = useCallback(() => {
    setCart(createEmptyCart());
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
   * Navigate to cart page
   * Note: This can only be called from client-side components
   */
  const navigateToCart = useCallback(() => {
    // Only navigate if we're in the browser
    if (typeof window !== 'undefined') {
      window.location.href = '/cart';
    }
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
      navigateToCart,
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
      navigateToCart,
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
