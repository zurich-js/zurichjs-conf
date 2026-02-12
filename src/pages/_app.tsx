import "@/styles/globals.css";
import "@/styles/ProfileCard.css";
import type { AppProps } from "next/app";
import { Figtree } from "next/font/google";
import { MotionProvider } from "@/contexts/MotionContext";
import { CartProvider } from "@/contexts/CartContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import type { SupportedCurrency } from "@/config/currency";
import { ToastProvider } from "@/contexts/ToastContext";
import { QueryClientProvider, HydrationBoundary, type DehydratedState } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryClient } from "@/lib/query-client";
import { NuqsAdapter } from "nuqs/adapters/next/pages";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import type { Cart } from '@/types/cart';
import { NavBar } from '@/components/organisms';
import dynamic from 'next/dynamic';

const DiscountContainer = dynamic(
  () => import('@/components/organisms/discount/DiscountContainer').then(mod => mod.DiscountContainer),
  { ssr: false }
);

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

/**
 * Extended page props with optional currency, cart, and discount data
 */
interface ExtendedPageProps {
  dehydratedState?: DehydratedState;
  initialCart?: Cart;
  detectedCurrency?: SupportedCurrency;
}

export default function App({ Component, pageProps }: AppProps<ExtendedPageProps>) {
  // Create a stable query client instance per request
  const [queryClient] = useState(() => getQueryClient());
  const router = useRouter();

  // Pass detected currency to provider (undefined for static pages triggers client-side geo detection)
  const detectedCurrency = pageProps.detectedCurrency;

  // Initialize PostHog
  useEffect(() => {
    // Initialize PostHog on the client side
    if (typeof window !== 'undefined') {
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

      if (!key) {
        console.error('[PostHog] API key not configured');
        return;
      }

      posthog.init(key, {
        api_host: '/ingest',
        ui_host: 'https://eu.posthog.com',
        person_profiles: 'always',
        capture_pageview: false,
        capture_pageleave: true,
        autocapture: false,
        disable_session_recording: false,
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: '[data-mask]',
        },
        loaded: (posthogInstance) => {
          if (process.env.NODE_ENV === 'development') {
            posthogInstance.debug();
          }

          // Track initial page view (UTM params are captured automatically by PostHog)
          posthogInstance.capture('$pageview', {
            $current_url: window.location.href,
            page_path: window.location.pathname,
          });
        },
      });
    }
  }, []);

  // Track page views on route changes
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // Only track if PostHog is initialized
      if (posthog.__loaded) {
        posthog.capture('$pageview', {
          $current_url: window.location.origin + url,
          page_path: url.split('?')[0], // Remove query params for cleaner path
        });
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  // Hide NavBar on admin pages
  const showNavBar = !router.pathname.startsWith('/admin');

  // Only show discount popup on homepage
  const showDiscount = router.pathname === '/';

  return (
    <PostHogProvider client={posthog}>
      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={pageProps.dehydratedState}>
          <NuqsAdapter>
            <CurrencyProvider currency={detectedCurrency}>
              <CartProvider initialCart={pageProps.initialCart}>
                <MotionProvider>
                  <ToastProvider>
                    <div className={figtree.variable}>
                      {showNavBar && <NavBar />}
                      <Component {...pageProps} />
                      {showDiscount && <DiscountContainer />}
                    </div>
                  </ToastProvider>
                </MotionProvider>
              </CartProvider>
            </CurrencyProvider>
          </NuqsAdapter>
        </HydrationBoundary>
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </PostHogProvider>
  );
}
