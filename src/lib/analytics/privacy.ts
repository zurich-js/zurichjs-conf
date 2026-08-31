export const ANALYTICS_QUERY_PARAMETERS = [
  'utm_campaign',
  'utm_content',
  'utm_creative_format',
  'utm_id',
  'utm_marketing_tactic',
  'utm_medium',
  'utm_source',
  'utm_source_platform',
  'utm_term',
] as const;

const ALLOWED_QUERY_PARAMETERS = new Set<string>(ANALYTICS_QUERY_PARAMETERS);

const URL_PROPERTIES = new Set([
  '$current_url',
  '$initial_current_url',
  '$referrer',
  '$session_recording_start_url',
  'current_url',
  'page_path',
  'page_url',
  'referrer',
  'url',
]);

const SENTRY_URL_PROPERTIES = new Set([
  'from',
  'http.route',
  'http.target',
  'http.url',
  'nextjs.request_path',
  'page_location',
  'request_path',
  'request.url',
  'to',
  'url',
  'url.full',
  'url.path',
]);

const SENTRY_QUERY_PROPERTIES = new Set([
  'http.fragment',
  'http.query',
  'http.query_string',
  'query',
  'query_string',
  'request.query_string',
  'url.fragment',
  'url.query',
]);

const SENTRY_SENSITIVE_PROPERTIES = new Set([
  'access_token',
  'address',
  'authorization',
  'cookie',
  'cookies',
  'password',
  'phone',
  'refresh_token',
  'secret',
  'token',
]);

const SENTRY_TEXT_PROPERTIES = new Set(['description', 'message', 'name', 'value']);
const MAX_SENTRY_SANITIZE_DEPTH = 8;

const UUID_PATH_SEGMENT =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

const SENSITIVE_PATHS: Array<{ pattern: RegExp; replacement: string }> = [
  {
    pattern: new RegExp(
      `^/api/orders/${UUID_PATH_SEGMENT}(?:\\.[a-z0-9_-]+){1,2}/?$`,
      'i'
    ),
    replacement: '/api/orders/[token]',
  },
  {
    pattern: new RegExp(
      `^/api/speaker-logistics/${UUID_PATH_SEGMENT}\\.[a-z0-9_-]+/?$`,
      'i'
    ),
    replacement: '/api/speaker-logistics/[token]',
  },
  {
    pattern: new RegExp(`^/validate/${UUID_PATH_SEGMENT}/?$`, 'i'),
    replacement: '/validate/[ticketId]',
  },
  {
    pattern: new RegExp(`^/api/qr/${UUID_PATH_SEGMENT}/?$`, 'i'),
    replacement: '/api/qr/[ticketId]',
  },
];

function sanitizeAnalyticsPath(pathname: string): string {
  for (const { pattern, replacement } of SENSITIVE_PATHS) {
    if (pattern.test(pathname)) return replacement;
  }
  return pathname;
}

/** Retain only campaign query parameters and remove credentials and fragments. */
export function sanitizeAnalyticsUrl(value: string): string {
  const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//');

  try {
    const url = new URL(value, 'https://analytics.invalid');
    url.username = '';
    url.password = '';
    url.hash = '';
    url.pathname = sanitizeAnalyticsPath(url.pathname);

    const discardedKeys = new Set<string>();
    for (const [key, queryValue] of url.searchParams) {
      if (!ALLOWED_QUERY_PARAMETERS.has(key.toLowerCase()) || /^bearer\s+/i.test(queryValue)) {
        discardedKeys.add(key);
      }
    }
    for (const key of discardedKeys) url.searchParams.delete(key);

    if (isAbsolute) return url.toString();
    return `${url.pathname}${url.search}`;
  } catch {
    return sanitizeAnalyticsPath(value.split(/[?#]/, 1)[0]);
  }
}

export function sanitizePostHogProperties<T extends Record<string, unknown>>(
  properties: T
): T {
  let sanitized: Record<string, unknown> | null = null;

  for (const property of URL_PROPERTIES) {
    const value = properties[property];
    if (typeof value !== 'string') continue;

    const safeValue = sanitizeAnalyticsUrl(value);
    if (safeValue !== value) {
      sanitized ??= { ...properties };
      sanitized[property] = safeValue;
    }
  }

  return (sanitized ?? properties) as T;
}

interface PostHogCaptureLike {
  properties: Record<string, unknown>;
}

/** Global PostHog before-send hook, including SDK-generated URL properties. */
export function sanitizePostHogEvent<T extends PostHogCaptureLike>(event: T | null): T | null {
  if (!event) return null;

  const properties = sanitizePostHogProperties(event.properties);
  return properties === event.properties ? event : { ...event, properties };
}

interface SentryDataLike {
  [key: string]: unknown;
}

interface SentryBreadcrumbLike {
  category?: string;
  data?: SentryDataLike;
  message?: string;
}

interface SentrySpanLike {
  attributes?: SentryDataLike;
  data?: SentryDataLike;
  description?: string;
  name?: string;
}

interface SentryEventLike {
  breadcrumbs?: SentryBreadcrumbLike[];
  contexts?: Record<string, SentryDataLike | undefined>;
  exception?: SentryDataLike;
  extra?: SentryDataLike;
  message?: string;
  request?: {
    cookies?: unknown;
    data?: unknown;
    env?: unknown;
    headers?: Record<string, string>;
    query_string?: unknown;
    url?: string;
  };
  spans?: SentrySpanLike[];
  transaction?: string;
  user?: SentryDataLike;
}

function sanitizeSentryText(value: string): string {
  return value.replace(/(?:https?:\/\/|\/\/|\/)[^\s<>"']+/gi, (candidate) => {
    const trailingPunctuation = candidate.match(/[).,;:]+$/)?.[0] ?? '';
    const url = trailingPunctuation
      ? candidate.slice(0, -trailingPunctuation.length)
      : candidate;
    return `${sanitizeAnalyticsUrl(url)}${trailingPunctuation}`;
  });
}

function sanitizeSentryData(
  data: SentryDataLike,
  depth = 0,
  seen = new WeakSet<object>()
): SentryDataLike {
  if (depth >= MAX_SENTRY_SANITIZE_DEPTH || seen.has(data)) return {};
  seen.add(data);

  const sanitized = { ...data };

  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = key.toLowerCase();
    if (
      SENTRY_QUERY_PROPERTIES.has(normalizedKey) ||
      SENTRY_SENSITIVE_PROPERTIES.has(normalizedKey)
    ) {
      delete sanitized[key];
    } else if (SENTRY_URL_PROPERTIES.has(normalizedKey) && typeof value === 'string') {
      sanitized[key] = sanitizeAnalyticsUrl(value);
    } else if (SENTRY_TEXT_PROPERTIES.has(normalizedKey) && typeof value === 'string') {
      sanitized[key] = sanitizeSentryText(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = depth + 1 >= MAX_SENTRY_SANITIZE_DEPTH
        ? []
        : value.map((item) => {
            if (typeof item === 'string') return sanitizeSentryText(item);
            if (typeof item === 'object' && item !== null) {
              return sanitizeSentryData(item as SentryDataLike, depth + 1, seen);
            }
            return item;
          });
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeSentryData(value as SentryDataLike, depth + 1, seen);
    }
  }

  return sanitized;
}

/** Console breadcrumbs can contain arbitrary logger arguments and private form data. */
export function sanitizeSentryBreadcrumb<T extends SentryBreadcrumbLike>(
  breadcrumb: T
): T | null {
  if (breadcrumb.category === 'console') return null;
  return {
    ...breadcrumb,
    ...(breadcrumb.data && { data: sanitizeSentryData(breadcrumb.data) }),
    ...(breadcrumb.message && { message: sanitizeOperationName(breadcrumb.message) }),
  };
}

function sanitizeOperationName(value: string): string {
  const methodAndUrl = value.match(/^([A-Z]{2,10}\s+)(\S.*)$/);
  if (methodAndUrl) {
    return `${methodAndUrl[1]}${sanitizeAnalyticsUrl(methodAndUrl[2])}`;
  }

  return /^(?:\/|https?:\/\/|\/\/)/i.test(value) || /[?#]/.test(value)
    ? sanitizeAnalyticsUrl(value)
    : value;
}

/** Remove bearer URLs from standalone and transaction-attached Sentry spans. */
export function sanitizeSentrySpan<T extends SentrySpanLike>(span: T): T {
  return {
    ...span,
    ...(span.attributes && { attributes: sanitizeSentryData(span.attributes) }),
    ...(span.data && { data: sanitizeSentryData(span.data) }),
    ...(span.description && { description: sanitizeOperationName(span.description) }),
    ...(span.name && { name: sanitizeOperationName(span.name) }),
  };
}

/** Strip request bodies, credentials, and non-campaign query data from Sentry events. */
export function sanitizeSentryEvent<T extends SentryEventLike>(event: T): T {
  const sanitized: SentryEventLike = { ...event };

  if (event.request) {
    const request = { ...event.request };
    delete request.cookies;
    delete request.data;
    delete request.env;
    delete request.headers;
    delete request.query_string;

    if (request.url) request.url = sanitizeAnalyticsUrl(request.url);
    sanitized.request = request;
  }

  if (event.breadcrumbs) {
    sanitized.breadcrumbs = event.breadcrumbs.flatMap((breadcrumb) => {
      const safeBreadcrumb = sanitizeSentryBreadcrumb(breadcrumb);
      return safeBreadcrumb ? [safeBreadcrumb] : [];
    });
  }

  if (event.contexts) {
    sanitized.contexts = Object.fromEntries(
      Object.entries(event.contexts).map(([key, context]) => [
        key,
        context ? sanitizeSentryData(context) : context,
      ])
    );
  }

  if (event.spans) sanitized.spans = event.spans.map(sanitizeSentrySpan);
  if (event.transaction) sanitized.transaction = sanitizeOperationName(event.transaction);
  if (event.extra) sanitized.extra = sanitizeSentryData(event.extra);
  if (event.message) sanitized.message = sanitizeSentryText(event.message);
  if (event.exception) sanitized.exception = sanitizeSentryData(event.exception);

  if (event.user) {
    if (typeof event.user.email === 'string') {
      sanitized.user = { email: event.user.email };
    } else {
      delete sanitized.user;
    }
  }

  return sanitized as T;
}

const PRIVATE_ANALYTICS_ROUTES = [
  '/admin',
  '/manage-order',
  '/quote',
  '/speaker-logistics',
  '/sponsor-quote',
  '/validate',
] as const;

const PRIVATE_CALLBACK_ROUTES = new Set([
  '/cfp/auth/callback',
  '/cfp/reviewer/auth/callback',
  '/namespace/review/callback',
]);

/** Screens that may contain bearer credentials, contact data, or private proposals. */
export function isPrivateAnalyticsRoute(value: string): boolean {
  try {
    const pathname = new URL(value, 'https://analytics.invalid').pathname;
    return PRIVATE_CALLBACK_ROUTES.has(pathname) || PRIVATE_ANALYTICS_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
  } catch {
    return true;
  }
}

interface SessionRecordingController {
  startSessionRecording(): void;
  stopSessionRecording(): void;
}

export function setSessionRecordingForRoute(
  controller: SessionRecordingController,
  route: string
): void {
  if (isPrivateAnalyticsRoute(route)) {
    controller.stopSessionRecording();
    return;
  }

  controller.startSessionRecording();
}
