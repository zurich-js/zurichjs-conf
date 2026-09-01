// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import {
  sanitizeSentryBreadcrumb,
  sanitizeSentryEvent,
  sanitizeSentrySpan,
} from "./src/lib/analytics/privacy";

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ??
    "https://2ecf4731ccaf3ac40da000ef51dd3fe3@o4510674417483776.ingest.de.sentry.io/4510674435178576",

  // Local dev stays out of the project entirely; preview deploys report but
  // are separable from production via the environment tag below.
  enabled: process.env.NODE_ENV === "production",
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Errors are always sent; traces are sampled.
  tracesSampleRate: 0.1,

  enableLogs: false,

  sendDefaultPii: false,
  beforeBreadcrumb: (breadcrumb) => sanitizeSentryBreadcrumb(breadcrumb),
  beforeSend: (event) => sanitizeSentryEvent(event),
  beforeSendTransaction: (event) => sanitizeSentryEvent(event),
  beforeSendSpan: (span) => sanitizeSentrySpan(span),
});
