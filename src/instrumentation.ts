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

  // PostHog error tracking (posthog-node needs the Node runtime).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { serverAnalytics } = await import("@/lib/analytics/server");
    serverAnalytics.captureException(error, {
      type: "system",
      severity: "high",
      unhandled: true,
      path: request.path,
      method: request.method,
      router_kind: context.routerKind,
      route_path: context.routePath,
      route_type: context.routeType,
    });
  }
};
