import "@/styles/globals.css";
import "@/styles/ProfileCard.css";
import type { AppProps } from "next/app";
import localFont from "next/font/local";
import { MotionProvider } from "@/contexts/MotionContext";
import { CartProvider } from "@/contexts/CartContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import type { SupportedCurrency } from "@/config/currency";
import { ToastProvider } from "@/contexts/ToastContext";
import { QueryClientProvider, HydrationBoundary, type DehydratedState } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryClient } from "@/lib/query-client";
import { NuqsAdapter } from "nuqs/adapters/next/pages";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Script from "next/script";
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import type { Cart } from '@/types/cart';
import { NavBar } from '@/components/organisms';
import dynamic from 'next/dynamic';
import { initEasterEgg } from '@/lib/easter-egg/client';
import { initTechStackDetection } from '@/lib/analytics/techStackDetector';
import { isSensitiveRoute, scrubIdentifiers } from '@/lib/analytics/sensitive-routes';

const DiscountContainer = dynamic(
  () => import('@/components/organisms/discount/DiscountContainer').then(mod => mod.DiscountContainer),
  { ssr: false }
);

const figtree = localFont({
  src: [
    {
      path: "./Figtree-VariableFont_wght.ttf",
      style: "normal",
    },
    {
      path: "./Figtree-Italic-VariableFont_wght.ttf",
      style: "italic",
    },
  ],
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
        // Never start a recording on a door screen. Attendee names, emails and
        // apparel sizes are on display there, and the URL carries a ticket
        // UUID that is itself the admission credential.
        disable_session_recording: isSensitiveRoute(window.location.pathname),
        session_recording: {
          // Keep checkout contact and billing inputs visible in replays; only
          // credential-style fields should be masked automatically.
          maskAllInputs: false,
          maskInputOptions: {
            password: true,
          },
          maskTextSelector: '[data-mask]',
        },
        loaded: (posthogInstance) => {
          if (process.env.NODE_ENV === 'development') {
            posthogInstance.debug();
          }

          // Track initial page view (UTM params are captured automatically by PostHog)
          posthogInstance.capture('$pageview', {
            $current_url: scrubIdentifiers(window.location.href),
            page_path: scrubIdentifiers(window.location.pathname),
          });

          // Initialize tech stack detection (runs once per session after idle)
          initTechStackDetection();
        },
      });
    }
  }, []);

  // True while we have deliberately stopped replay for a door screen, so we
  // only ever resume a recording we suppressed ourselves.
  const recordingSuppressed = useRef(isSensitiveRoute(router.pathname));

  // Track page views on route changes
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // Only track if PostHog is initialized
      if (posthog.__loaded) {
        // Stop replay when entering a door screen, and resume only if we are
        // the ones who stopped it — so ordinary pages keep whatever the init
        // config chose. disable_session_recording governs only the initial
        // state, so a client-side navigation into /checkin would otherwise
        // keep recording.
        if (isSensitiveRoute(url)) {
          if (!recordingSuppressed.current) {
            recordingSuppressed.current = true;
            posthog.stopSessionRecording();
          }
        } else if (recordingSuppressed.current) {
          recordingSuppressed.current = false;
          posthog.startSessionRecording();
        }

        posthog.capture('$pageview', {
          $current_url: scrubIdentifiers(window.location.origin + url),
          // Strip the query string for a cleaner path, then the identifiers.
          page_path: scrubIdentifiers(url.split('?')[0]),
        });
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  // Initialize console easter egg
  useEffect(() => {
    initEasterEgg();
  }, []);

  // Hide NavBar on admin and door pages. A door station is a single-purpose
  // screen held in one hand; a marketing nav and a shopping cart on it are
  // mis-taps waiting to happen.
  const showNavBar =
    !router.pathname.startsWith('/admin') && !isSensitiveRoute(router.pathname);

  // Discount popup mounts on the high-traffic content pages, not just the
  // homepage — /speakers alone starts 16% of sessions. The individual speaker
  // and workshop pages are included too: they're strong pre-purchase intent
  // signals and were previously the biggest slice of traffic that could never
  // see the offer, since only the index routes matched.
  const showDiscount = [
    '/',
    '/speakers',
    '/speakers/[slug]',
    '/workshops',
    '/workshops/[slug]',
    '/schedule',
  ].includes(router.pathname);

  return (
    <>
      <Script
        async
        src="https://www.googletagmanager.com/gtag/js?id=AW-18272636718"
        strategy="afterInteractive"
      />
      <Script id="google-ads-tag" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'AW-18272636718');
        `}
      </Script>
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
    </>
  );
}
