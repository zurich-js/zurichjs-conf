import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Figtree } from "next/font/google";
import { MotionProvider } from "@/contexts/MotionContext";
import { CartProvider } from "@/contexts/CartContext";
import { QueryClientProvider, HydrationBoundary } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryClient } from "@/lib/query-client";
import { NuqsAdapter } from "nuqs/adapters/next/pages";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export default function App({ Component, pageProps }: AppProps) {
  // Create a stable query client instance per request
  const [queryClient] = useState(() => getQueryClient());
  const router = useRouter();

  // Initialize PostHog
  useEffect(() => {
    // Initialize PostHog on the client side
    if (typeof window !== 'undefined') {
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

      if (!key) {
        console.error('[PostHog] API key not configured');
        return;
      }

      posthog.init(key, {
        api_host: host,
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

  return (
    <PostHogProvider client={posthog}>
      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={pageProps.dehydratedState}>
          <NuqsAdapter>
            <CartProvider initialCart={pageProps.initialCart}>
              <MotionProvider>
                <div className={figtree.variable}>
                  <Component {...pageProps} />
                </div>
              </MotionProvider>
            </CartProvider>
          </NuqsAdapter>
        </HydrationBoundary>
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </PostHogProvider>
  );
}
