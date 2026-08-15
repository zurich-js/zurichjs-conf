import { describe, expect, it, vi } from 'vitest';
import {
  isPrivateAnalyticsRoute,
  sanitizeAnalyticsUrl,
  sanitizePostHogEvent,
  sanitizePostHogProperties,
  sanitizeSentryBreadcrumb,
  sanitizeSentryEvent,
  sanitizeSentrySpan,
  setSessionRecordingForRoute,
} from '../privacy';

describe('analytics URL privacy', () => {
  it('removes auth and session query values while keeping campaign data', () => {
    const safe = sanitizeAnalyticsUrl(
      'https://conf.zurichjs.com/manage?token=ticket-secret&code=oauth-code&session_id=session-secret&utm_source=email'
    );

    expect(safe).toBe('https://conf.zurichjs.com/manage?utm_source=email');
    expect(safe).not.toContain('ticket-secret');
    expect(safe).not.toContain('oauth-code');
    expect(safe).not.toContain('session-secret');
  });

  it('drops every non-UTM query parameter, including unknown keys', () => {
    expect(
      sanitizeAnalyticsUrl(
        '/tickets?orderToken=secret&credential=Bearer%20abc123&view=details&utm_content=card'
      )
    ).toBe('/tickets?utm_content=card');
  });

  it('removes URL credentials and fragments that may carry OAuth tokens', () => {
    expect(
      sanitizeAnalyticsUrl('https://admin:password@conf.zurichjs.com/callback#access_token=secret')
    ).toBe('https://conf.zurichjs.com/callback');
  });

  it('redacts signed tokens and entry-pass IDs embedded in URL paths', () => {
    const ticketId = 'fdd332be-86c9-4842-912c-e5c1c0968606';
    const nonce = '9dc7c037-ef40-4ac5-b24c-66ee9e9ee0f9';

    expect(
      sanitizeAnalyticsUrl(
        `https://conf.zurichjs.com/api/orders/${ticketId}.${nonce}.signed-secret?utm_source=email`
      )
    ).toBe('https://conf.zurichjs.com/api/orders/[token]?utm_source=email');
    expect(
      sanitizeAnalyticsUrl(`/api/speaker-logistics/${ticketId}.signed-secret`)
    ).toBe('/api/speaker-logistics/[token]');
    expect(sanitizeAnalyticsUrl(`/validate/${ticketId}`)).toBe('/validate/[ticketId]');
    expect(sanitizeAnalyticsUrl(`/api/qr/${ticketId}`)).toBe('/api/qr/[ticketId]');
  });

  it('fails closed for malformed URLs', () => {
    expect(sanitizeAnalyticsUrl('https://%invalid?token=secret#fragment')).toBe(
      'https://%invalid'
    );
  });

  it('sanitizes all PostHog URL properties without mutating the input', () => {
    const properties = {
      $current_url: 'https://conf.zurichjs.com/share?token=secret&utm_medium=qr',
      $referrer: 'https://example.com/oauth?code=secret',
      page_url: '/manage?sessionId=secret',
      referrer: '/login#access_token=secret',
      unrelated: 'unchanged',
    };

    const safe = sanitizePostHogProperties(properties);

    expect(safe).toEqual({
      $current_url: 'https://conf.zurichjs.com/share?utm_medium=qr',
      $referrer: 'https://example.com/oauth',
      page_url: '/manage',
      referrer: '/login',
      unrelated: 'unchanged',
    });
    expect(properties.$current_url).toContain('secret');
  });

  it('sanitizes SDK-generated $current_url through the before-send hook', () => {
    const event = {
      event: '$pageview',
      properties: { $current_url: 'https://conf.zurichjs.com/manage?token=secret' },
    };

    expect(sanitizePostHogEvent(event)).toEqual({
      event: '$pageview',
      properties: { $current_url: 'https://conf.zurichjs.com/manage' },
    });
    expect(sanitizePostHogEvent(null)).toBeNull();
  });

  it('removes private request data and bearer URLs from Sentry events', () => {
    const event = {
      request: {
        url: 'https://conf.zurichjs.com/manage-order?token=ticket-secret&utm_source=email',
        query_string: 'token=ticket-secret',
        data: { email: 'private@example.com' },
        cookies: { admin_session: 'secret' },
        headers: {
          Authorization: 'Bearer secret',
          Cookie: 'admin_session=secret',
          Accept: 'application/json',
        },
      },
      transaction: 'GET /manage-order?token=ticket-secret',
      breadcrumbs: [
        {
          category: 'console',
          data: { arguments: ['private@example.com', 'stripe-secret'] },
        },
        {
          message:
            'GET /api/orders/fdd332be-86c9-4842-912c-e5c1c0968606.9dc7c037-ef40-4ac5-b24c-66ee9e9ee0f9.signed-secret',
          data: {
            from: '/tickets?token=secret',
            to: '/manage-order?token=ticket-secret&utm_medium=email',
            query: 'token=ticket-secret',
          },
        },
      ],
      contexts: {
        nextjs: {
          request_path:
            '/api/orders/fdd332be-86c9-4842-912c-e5c1c0968606.9dc7c037-ef40-4ac5-b24c-66ee9e9ee0f9.signed-secret',
        },
      },
    };

    const safe = sanitizeSentryEvent(event);

    expect(safe.request).toEqual({
      url: 'https://conf.zurichjs.com/manage-order?utm_source=email',
    });
    expect(safe.transaction).toBe('GET /manage-order');
    expect(safe.breadcrumbs).toHaveLength(1);
    expect(safe.breadcrumbs?.[0].message).toBe('GET /api/orders/[token]');
    expect(safe.breadcrumbs?.[0].data).toEqual({
      from: '/tickets',
      to: '/manage-order?utm_medium=email',
    });
    expect(safe.contexts?.nextjs).toEqual({ request_path: '/api/orders/[token]' });
    expect(event.request.data).toEqual({ email: 'private@example.com' });
  });

  it('sanitizes nested, cyclic, and top-level Sentry data', () => {
    const ticketId = 'fdd332be-86c9-4842-912c-e5c1c0968606';
    const nonce = '9dc7c037-ef40-4ac5-b24c-66ee9e9ee0f9';
    const cyclic: Record<string, unknown> = {
      url: '/manage-order?token=ticket-secret',
    };
    cyclic.self = cyclic;

    const safe = sanitizeSentryEvent({
      message: `Failed GET /api/orders/${ticketId}.${nonce}.signed-secret.`,
      extra: {
        phone: '+41 44 000 00 00',
        nested: [
          { 'http.url': '/manage-order?token=ticket-secret' },
          '/speaker-logistics?token=speaker-secret',
        ],
        cyclic,
      },
      user: {
        email: 'attendee@example.com',
        id: ticketId,
        phone: '+41 44 000 00 00',
      },
      exception: {
        values: [
          {
            value: `GET /api/orders/${ticketId}.${nonce}.signed-secret`,
          },
        ],
      },
    });

    expect(safe.message).toBe('Failed GET /api/orders/[token].');
    expect(safe.extra).toEqual({
      nested: [
        { 'http.url': '/manage-order' },
        '/speaker-logistics',
      ],
      cyclic: {
        url: '/manage-order',
        self: {},
      },
    });
    expect(safe.user).toEqual({ email: 'attendee@example.com' });
    expect(safe.exception).toEqual({
      values: [{ value: 'GET /api/orders/[token]' }],
    });
  });

  it('sanitizes URL attributes on standalone Sentry spans', () => {
    expect(
      sanitizeSentrySpan({
        name: 'GET /manage-order?token=ticket-secret&utm_campaign=networking',
        attributes: {
          'http.url': 'https://conf.zurichjs.com/manage-order?token=ticket-secret',
          'http.query': 'token=ticket-secret',
          'http.method': 'GET',
          'url.full':
            'https://conf.zurichjs.com/api/speaker-logistics/fdd332be-86c9-4842-912c-e5c1c0968606.signed-secret?token=secret#access_token=secret',
          'url.path':
            '/api/speaker-logistics/fdd332be-86c9-4842-912c-e5c1c0968606.signed-secret',
          'url.query': 'token=secret',
          'url.fragment': 'access_token=secret',
        },
      })
    ).toEqual({
      name: 'GET /manage-order?utm_campaign=networking',
      attributes: {
        'http.url': 'https://conf.zurichjs.com/manage-order',
        'http.method': 'GET',
        'url.full': 'https://conf.zurichjs.com/api/speaker-logistics/[token]',
        'url.path': '/api/speaker-logistics/[token]',
      },
    });
  });

  it('drops console breadcrumbs before arbitrary arguments reach Sentry', () => {
    expect(
      sanitizeSentryBreadcrumb({
        category: 'console',
        message: 'private@example.com',
        data: { arguments: ['private@example.com'] },
      })
    ).toBeNull();
  });

  it('classifies admin and manage-ticket screens as private', () => {
    for (const route of [
      '/admin',
      '/admin/sponsorships?tab=networking',
      '/manage-order?token=secret',
      'https://conf.zurichjs.com/manage-order/details',
      '/speaker-logistics?token=secret',
      '/cfp/auth/callback#access_token=secret',
      '/cfp/reviewer/auth/callback#access_token=secret',
      '/namespace/review/callback#access_token=secret',
      '/quote?q=private-proposal',
      '/sponsor-quote?q=private-proposal',
      '/validate/fdd332be-86c9-4842-912c-e5c1c0968606',
    ]) {
      expect(isPrivateAnalyticsRoute(route)).toBe(true);
    }

    expect(isPrivateAnalyticsRoute('/share/attendee-public-id')).toBe(false);
    expect(isPrivateAnalyticsRoute('/administrator')).toBe(false);
  });

  it('stops replay on private routes and starts it on public routes', () => {
    const controller = {
      startSessionRecording: vi.fn(),
      stopSessionRecording: vi.fn(),
    };

    setSessionRecordingForRoute(controller, '/manage-order?token=secret');
    expect(controller.stopSessionRecording).toHaveBeenCalledOnce();
    expect(controller.startSessionRecording).not.toHaveBeenCalled();

    setSessionRecordingForRoute(controller, '/share/speaker-alex');
    expect(controller.startSessionRecording).toHaveBeenCalledOnce();
  });
});
