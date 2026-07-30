/**
 * useCartRoutePrefetch — warms the /cart route bundle on mount.
 *
 * Add-to-cart surfaces navigate via router.push (buttons, not Links), so
 * without this the cart bundle only loads at click time. Next dedupes
 * repeated prefetches, so many instances on one page are fine.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export function useCartRoutePrefetch(): void {
  const router = useRouter();
  useEffect(() => {
    void router.prefetch('/cart');
  }, [router]);
}
