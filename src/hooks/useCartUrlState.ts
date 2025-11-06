/**
 * Custom hook for syncing cart context with URL state on the cart page
 *
 * This hook synchronizes the global cart context with URL state on the cart page only.
 * This allows for shareable cart URLs while keeping the URL clean on other pages.
 */

import { useEffect, useRef } from 'react';
import { useQueryState, parseAsString } from 'nuqs';
import type { Cart } from '@/types/cart';
import {
  encodeCartState,
  decodeCartState,
} from '@/lib/cart-url-state';

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
 * 1. On mount: Load cart from URL if present and update context
 * 2. On cart changes: Update URL with obfuscated cart state
 * 3. On unmount: Remove cart from URL
 *
 * @param cart - Current cart state from context
 * @param onCartLoad - Callback to update cart context when loading from URL
 */
export function useCartUrlSync(
  cart: Cart,
  onCartLoad?: (cart: Cart) => void
) {
  const [encodedCart, setEncodedCart] = useQueryState(
    'cart',
    parseAsString.withOptions({ shallow: true, clearOnDefault: true })
  );

  const hasLoadedFromUrl = useRef(false);

  // On mount: Load cart from URL if present
  useEffect(() => {
    if (!hasLoadedFromUrl.current && encodedCart && onCartLoad) {
      const urlCart = decodeCartState(encodedCart);
      if (urlCart && urlCart.items.length > 0) {
        onCartLoad(urlCart);
      }
      hasLoadedFromUrl.current = true;
    }
  }, [encodedCart, onCartLoad]);

  // Sync cart to URL whenever it changes
  useEffect(() => {
    if (hasLoadedFromUrl.current || !encodedCart) {
      if (cart.items.length > 0) {
        const encoded = encodeCartState(cart);
        if (encoded !== encodedCart) {
          setEncodedCart(encoded);
        }
      } else {
        // Clear URL if cart is empty
        setEncodedCart(null);
      }
    }
  }, [cart, encodedCart, setEncodedCart]);

  // On unmount: Clear cart from URL
  useEffect(() => {
    return () => {
      // Clear the URL parameter when leaving the cart page
      setEncodedCart(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
