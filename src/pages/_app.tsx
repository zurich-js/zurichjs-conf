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
        },
      });
    }
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={pageProps.dehydratedState}>
          <NuqsAdapter>
            <CartProvider>
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
