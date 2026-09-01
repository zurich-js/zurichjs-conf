import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

/**
 * The catch-all for server errors nothing caught: a throw outside a handler's
 * try/catch, a crash in getServerSideProps, a failure in Next itself. Handled
 * errors go through `logger.error` and reach PostHog there — this hook is what
 * makes the UNhandled ones visible too, instead of only ever existing as a 500
 * in Vercel's logs.
 */
export const onRequestError: typeof Sentry.captureRequestError = async (
  error,
  request,
  context
) => {
  Sentry.captureRequestError(error, request, context);

  // PostHog error tracking (posthog-node needs the Node runtime). Awaited so
  // the serverless function is not frozen before the event is delivered.
  // Deliberately no raw `request.path`: URLs here can carry ticket UUIDs and
  // signed tokens (e.g. /validate/<uuid>), so only the route TEMPLATE from
  // `context.routePath` (e.g. /validate/[id]) is reported.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { serverAnalytics } = await import("@/lib/analytics/server");
    await serverAnalytics.captureException(error, {
      type: "system",
      severity: "high",
      unhandled: true,
      method: request.method,
      router_kind: context.routerKind,
      route_path: context.routePath,
      route_type: context.routeType,
    });
  }
};
