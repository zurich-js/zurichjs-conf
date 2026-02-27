import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';
 
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`;

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Configure image optimization for Supabase storage
  // Optimized to reduce Vercel Image Optimization usage
  images: {
    // Only allow Supabase storage images (removed unused Unsplash)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Cache optimized images for 31 days to reduce transformations
    minimumCacheTTL: 2678400,
    // Use only WebP format (avif adds extra transformations)
    formats: ['image/webp'],
    // Reduce device sizes to match actual usage (removed 3840px ultra-wide)
    deviceSizes: [640, 750, 828, 1080, 1280, 1536, 2048],
    // Reduce image sizes to match actual component usage
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    // Limit quality options to reduce transformation variants
    qualities: [75, 90],
  },

  // Explicitly expose PostHog environment variables to the client
  // This ensures they're properly bundled and available during initialization
  env: {
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },

  // Proxy PostHog requests to bypass ad blockers
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://eu.i.posthog.com/decide',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, ''),
          },
          {
            key: 'x-frame-options',
            value: 'SAMEORIGIN,
          },
         {
           key: 'X-Content-Type-Options',
           value: 'nosniff'
         },
         {
           key: 'Strict-Transport-Security',
           value: 'max-age=63072000; includeSubDomains; preload'
         }
         {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin'
         }
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "zurichjs",

  project: "zurichjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
