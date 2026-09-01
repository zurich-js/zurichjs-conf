// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import {
  sanitizeSentryBreadcrumb,
  sanitizeSentryEvent,
  sanitizeSentrySpan,
} from "@/lib/analytics/privacy";
import { isSensitiveRoute } from "@/lib/analytics/sensitive-routes";

Sentry.init({
  dsn: "https://2ecf4731ccaf3ac40da000ef51dd3fe3@o4510674417483776.ingest.de.sentry.io/4510674435178576",

  // Add optional integrations for additional features.
  // Replay is omitted entirely on door screens: those display attendee names,
  // emails and apparel sizes, and PostHog replay is already disabled there.
  integrations: isSensitiveRoute(
    typeof window === "undefined" ? undefined : window.location.pathname,
  )
    ? []
    : [Sentry.replayIntegration()],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  enableLogs: false,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  sendDefaultPii: false,
  beforeBreadcrumb: (breadcrumb) => sanitizeSentryBreadcrumb(breadcrumb),
  beforeSend: (event) => sanitizeSentryEvent(event),
  beforeSendTransaction: (event) => sanitizeSentryEvent(event),
  beforeSendSpan: (span) => sanitizeSentrySpan(span),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
