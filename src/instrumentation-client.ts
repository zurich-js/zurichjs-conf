// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

import { isSensitiveRoute, scrubIdentifiers } from "@/lib/analytics/sensitive-routes";

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
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // A ticket UUID in a URL is an admission credential. Strip it from event
  // URLs and breadcrumbs before anything leaves the browser.
  beforeSend(event) {
    if (event.request?.url) {
      event.request.url = scrubIdentifiers(event.request.url);
    }
    if (event.transaction) {
      event.transaction = scrubIdentifiers(event.transaction);
    }
    return event;
  },

  beforeBreadcrumb(breadcrumb) {
    if (typeof breadcrumb.data?.url === "string") {
      breadcrumb.data.url = scrubIdentifiers(breadcrumb.data.url);
    }
    if (typeof breadcrumb.data?.to === "string") {
      breadcrumb.data.to = scrubIdentifiers(breadcrumb.data.to);
    }
    if (typeof breadcrumb.data?.from === "string") {
      breadcrumb.data.from = scrubIdentifiers(breadcrumb.data.from);
    }
    return breadcrumb;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
