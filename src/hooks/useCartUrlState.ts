/**
 * Custom hook for syncing cart context with URL state on the cart page
 *
 * This hook synchronizes the global cart context with URL state on the cart page only.
 * This allows for shareable cart URLs while keeping the URL clean on other pages.
 *
 * Note: Cart loading from URL now happens server-side in getServerSideProps,
 * so this hook only handles context → URL synchronization.
 */

import { useEffect, useRef } from 'react';
import { useQueryState, parseAsString } from 'nuqs';
import type { Cart } from '@/types/cart';
import { encodeCartState } from '@/lib/cart-url-state';

/**
 * Hook to sync cart context with URL state (for cart page only)
 *
 * Usage on cart page:
 * ```tsx
 * const { cart } = useCart();
 * useCartUrlSync(cart);
 * ```
 *
 * This will:
 * 1. On cart changes: Update URL with obfuscated cart state
 * 2. On unmount: Clear cart from URL (when navigating away)
 *
 * Note: Cart is now loaded server-side via getServerSideProps and passed
 * as initialCart to CartProvider. This hook only syncs changes back to URL.
 *
 * @param cart - Current cart state from context
 */
export function useCartUrlSync(cart: Cart) {
  const [encodedCart, setEncodedCart] = useQueryState(
    'cart',
    parseAsString.withOptions({ shallow: true, clearOnDefault: true })
  );

  const isInitialized = useRef(false);

  // Sync cart to URL whenever it changes
  useEffect(() => {
    // Skip the first render since URL already has the cart from SSR
    if (!isInitialized.current) {
      isInitialized.current = true;
      return;
    }

    if (cart.items.length > 0) {
      const encoded = encodeCartState(cart);
      if (encoded !== encodedCart) {
        setEncodedCart(encoded);
      }
    } else {
      // Clear URL if cart is empty
      setEncodedCart(null);
    }
  }, [cart, encodedCart, setEncodedCart]);

  // On unmount: Clear cart from URL when leaving the cart page
  useEffect(() => {
    return () => {
      setEncodedCart(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
