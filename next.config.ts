import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    '/api/admin/badges/export': [
      './assets/badges/templates/*.pdf',
      './public/fonts/figtree-400.ttf',
      './public/fonts/figtree-700.ttf',
    ],
  },

  // Turbopack: resolve Node.js built-ins to empty modules for browser bundles.
  // The barcode-detector library's WebAssembly loader contains Node.js detection
  // code that references these modules; they're never actually called in a
  // browser, but Turbopack's static analysis still tries to resolve them.
  turbopack: {
    resolveAlias: {
      // Node.js core modules — comprehensive list for libraries with Node detection
      fs: { browser: './turbopack-empty.js' },
      'node:fs': { browser: './turbopack-empty.js' },
      'node:fs/promises': { browser: './turbopack-empty.js' },
      path: { browser: './turbopack-empty.js' },
      'node:path': { browser: './turbopack-empty.js' },
      readline: { browser: './turbopack-empty.js' },
      'node:readline': { browser: './turbopack-empty.js' },
      os: { browser: './turbopack-empty.js' },
      'node:os': { browser: './turbopack-empty.js' },
      crypto: { browser: './turbopack-empty.js' },
      'node:crypto': { browser: './turbopack-empty.js' },
      stream: { browser: './turbopack-empty.js' },
      'node:stream': { browser: './turbopack-empty.js' },
      util: { browser: './turbopack-empty.js' },
      'node:util': { browser: './turbopack-empty.js' },
      child_process: { browser: './turbopack-empty.js' },
      'node:child_process': { browser: './turbopack-empty.js' },
      net: { browser: './turbopack-empty.js' },
      'node:net': { browser: './turbopack-empty.js' },
      tty: { browser: './turbopack-empty.js' },
      'node:tty': { browser: './turbopack-empty.js' },
      module: { browser: './turbopack-empty.js' },
      'node:module': { browser: './turbopack-empty.js' },
      async_hooks: { browser: './turbopack-empty.js' },
      'node:async_hooks': { browser: './turbopack-empty.js' },
      buffer: { browser: './turbopack-empty.js' },
      'node:buffer': { browser: './turbopack-empty.js' },
      http: { browser: './turbopack-empty.js' },
      'node:http': { browser: './turbopack-empty.js' },
      https: { browser: './turbopack-empty.js' },
      'node:https': { browser: './turbopack-empty.js' },
      zlib: { browser: './turbopack-empty.js' },
      'node:zlib': { browser: './turbopack-empty.js' },
      url: { browser: './turbopack-empty.js' },
      'node:url': { browser: './turbopack-empty.js' },
      events: { browser: './turbopack-empty.js' },
      'node:events': { browser: './turbopack-empty.js' },
      assert: { browser: './turbopack-empty.js' },
      'node:assert': { browser: './turbopack-empty.js' },
      querystring: { browser: './turbopack-empty.js' },
      'node:querystring': { browser: './turbopack-empty.js' },
      constants: { browser: './turbopack-empty.js' },
      'node:constants': { browser: './turbopack-empty.js' },
      dns: { browser: './turbopack-empty.js' },
      'node:dns': { browser: './turbopack-empty.js' },
      worker_threads: { browser: './turbopack-empty.js' },
      'node:worker_threads': { browser: './turbopack-empty.js' },
      perf_hooks: { browser: './turbopack-empty.js' },
      'node:perf_hooks': { browser: './turbopack-empty.js' },
      v8: { browser: './turbopack-empty.js' },
      'node:v8': { browser: './turbopack-empty.js' },
      vm: { browser: './turbopack-empty.js' },
      'node:vm': { browser: './turbopack-empty.js' },
      process: { browser: './turbopack-empty.js' },
      'node:process': { browser: './turbopack-empty.js' },
      inspector: { browser: './turbopack-empty.js' },
      'node:inspector': { browser: './turbopack-empty.js' },
      diagnostics_channel: { browser: './turbopack-empty.js' },
      'node:diagnostics_channel': { browser: './turbopack-empty.js' },
    },
  },

  // Configure image optimization for Supabase storage
  // Optimized to reduce Vercel Image Optimization usage
  images: {
    // Only allow Supabase storage images (removed unused Unsplash)
    dangerouslyAllowLocalIP: process.env.NODE_ENV === 'development',
    remotePatterns: [
        {
            protocol: 'https',
            hostname: '**.supabase.co',
            pathname: '/storage/v1/object/public/**',
        },
        ...(process.env.NODE_ENV === 'development' ? [
            {
                protocol: 'http',
                hostname: '127.0.0.1',
                port: '54321',
                pathname: '/storage/v1/object/public/**',
            } as const,
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '54321',
                pathname: '/storage/v1/object/public/**',
            } as const
        ] : [])
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
