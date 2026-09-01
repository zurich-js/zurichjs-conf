/**
 * The logger is the single choke point for error tracking: every
 * `log.error()` must land in BOTH PostHog and Sentry with the same code,
 * severity and fingerprint, or conference-day triage means reconciling two
 * tools by timestamp. These tests pin that contract.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

vi.mock('@/lib/analytics/server', () => ({
  serverAnalytics: {
    captureException: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/analytics/client', () => ({
  analytics: { error: vi.fn() },
}));

import * as Sentry from '@sentry/nextjs';
import { serverAnalytics } from '@/lib/analytics/server';
import { AppError, DatabaseError, ErrorCodes } from '@/lib/errors';
import { logger } from '..';

const sentryCapture = vi.mocked(Sentry.captureException);
const sentryBreadcrumb = vi.mocked(Sentry.addBreadcrumb);
const posthogCapture = vi.mocked(serverAnalytics.captureException);

beforeEach(() => {
  vi.clearAllMocks();
  // Silence console output; assertions target the tracking sinks.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('logger.error fan-out', () => {
  it('sends an AppError to Sentry and PostHog with the same fingerprint and code', () => {
    const err = new DatabaseError('Failed to load tickets', {
      context: { sessionId: 's_1' },
    });

    logger.error('Ticket lookup failed', err, { module: 'Tickets API', requestId: 'req-42' });

    expect(sentryCapture).toHaveBeenCalledTimes(1);
    const [sentryErr, sentryCtx] = sentryCapture.mock.calls[0] as [
      Error,
      { level: string; tags: Record<string, string>; fingerprint?: string[] },
    ];
    expect(sentryErr).toBe(err);
    expect(sentryCtx.level).toBe('error'); // high → error
    expect(sentryCtx.tags.error_code).toBe(ErrorCodes.DB_QUERY_FAILED);
    expect(sentryCtx.tags.request_id).toBe('req-42');
    expect(sentryCtx.tags.module).toBe('Tickets API');
    expect(sentryCtx.fingerprint).toEqual([`DatabaseError/${ErrorCodes.DB_QUERY_FAILED}`]);

    expect(posthogCapture).toHaveBeenCalledTimes(1);
    const [posthogErr, posthogCtx] = posthogCapture.mock.calls[0] as [
      Error,
      { fingerprint?: string; code?: string },
    ];
    expect(posthogErr).toBe(err);
    expect(posthogCtx.fingerprint).toBe(`DatabaseError/${ErrorCodes.DB_QUERY_FAILED}`);
    expect(posthogCtx.code).toBe(ErrorCodes.DB_QUERY_FAILED);
  });

  it('maps critical severity to Sentry fatal', () => {
    logger.error('Payment exploded', new AppError('boom', { severity: 'critical', type: 'payment' }));

    const [, ctx] = sentryCapture.mock.calls[0] as [Error, { level: string }];
    expect(ctx.level).toBe('fatal');
  });

  it('re-slots a bare context object passed in the error slot', () => {
    // The widespread `log.error(msg, { userId })` slip: previously coerced into
    // a stackless "NonError" that collapsed 55 call sites into one issue.
    logger.error('Sponsorship save failed', { sponsorshipId: 'sp_9', step: 'invoice' });

    const [exception, ctx] = posthogCapture.mock.calls[0] as [
      Error,
      { fingerprint?: string; sponsorshipId?: string; step?: string },
    ];
    expect(exception.message).toBe('Sponsorship save failed');
    expect(exception.name).toBe('Error'); // synthetic, not "NonError"
    expect(ctx.sponsorshipId).toBe('sp_9');
    expect(ctx.step).toBe('invoice');
    // Message-only logs group per message, not per shared synthetic stack.
    expect(ctx.fingerprint).toBe('log/Sponsorship save failed');
  });

  it('still coerces an object that looks like a real error (has message)', () => {
    logger.error('Query failed', { message: 'relation does not exist', code: '42P01' });

    const [exception] = posthogCapture.mock.calls[0] as [Error];
    expect(exception.message).toBe('relation does not exist');
  });

  it('adds a Sentry breadcrumb for warnings', () => {
    logger.warn('Rate limit approaching', { ip: '1.2.3.4' });

    expect(sentryBreadcrumb).toHaveBeenCalledTimes(1);
    expect(sentryBreadcrumb.mock.calls[0][0]).toMatchObject({
      category: 'logger',
      level: 'warning',
      message: 'Rate limit approaching',
    });
    expect(sentryCapture).not.toHaveBeenCalled();
  });
});
