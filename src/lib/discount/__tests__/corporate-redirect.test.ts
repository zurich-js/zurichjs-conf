/**
 * Tests for the /corporate/<code> redirect.
 *
 * The whole point of the route is that it never renders, so the behaviour worth
 * pinning down is all here: everyone lands on the ticket section, and only a
 * valid code leaves the handoff cookie behind.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GetServerSidePropsContext } from 'next';

vi.mock('@/config/env', () => ({
  env: { supabase: { secretKey: 'test-secret-key-for-signing' } },
}));

vi.mock('@/lib/logger', () => ({
  logger: { scope: () => ({ info: vi.fn(), error: vi.fn() }) },
}));

const track = vi.fn();
const getPostHogDistinctId = vi.fn<() => string | null>(() => 'ph-distinct-1');

vi.mock('@/lib/analytics/server', () => ({
  serverAnalytics: { track: (...args: unknown[]) => track(...args) },
  getPostHogDistinctId: () => getPostHogDistinctId(),
}));

const { signCorporateCode } = await import('../corporate-code');
const { resolveCorporateLink } = await import('../corporate-redirect');

const TICKETS = { redirect: { destination: '/#tickets', permanent: false } };

function runRoute(code: unknown) {
  const setHeader = vi.fn();
  const ctx = {
    params: { code },
    req: { cookies: {} },
    res: { setHeader },
  } as unknown as GetServerSidePropsContext;

  return { result: resolveCorporateLink(ctx), setHeader };
}

/** The Set-Cookie value the route wrote, or null if it wrote none. */
function cookieFrom(setHeader: ReturnType<typeof vi.fn>): string | null {
  const call = setHeader.mock.calls.find(([name]) => name === 'Set-Cookie');
  return call ? (call[1] as string) : null;
}

describe('/corporate/<code>', () => {
  beforeEach(() => {
    track.mockClear();
    getPostHogDistinctId.mockReturnValue('ph-distinct-1');
  });

  it('redirects a valid code to the ticket section and hands off the label', async () => {
    const { result, setHeader } = runRoute(signCorporateCode({ label: 'Acme AG', validDays: 30 }));

    expect(await result).toEqual(TICKETS);
    expect(cookieFrom(setHeader)).toContain('corporate_handoff=Acme%20AG');
  });

  it('sends an expired code to the same place, without marking the browser', async () => {
    // A stale link must be indistinguishable from a plain link to the tickets —
    // the visitor should never learn that anything failed.
    const code = signCorporateCode({ label: 'Acme AG', validDays: 1 });
    vi.setSystemTime(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));

    const { result, setHeader } = runRoute(code);

    expect(await result).toEqual(TICKETS);
    expect(cookieFrom(setHeader)).toBeNull();
    expect(track).toHaveBeenCalledWith(
      'corporate_access_link_opened',
      'ph-distinct-1',
      expect.objectContaining({ valid: false, reason: 'expired' })
    );

    vi.useRealTimers();
  });

  it('redirects rather than erroring on junk', async () => {
    for (const bad of ['nonsense', '', undefined, ['a', 'b']]) {
      const { result, setHeader } = runRoute(bad);
      expect(await result).toEqual(TICKETS);
      expect(cookieFrom(setHeader)).toBeNull();
    }
  });

  it('records the open against the visitor PostHog already knows', async () => {
    const { result } = runRoute(signCorporateCode({ label: 'Globex', validDays: 30 }));
    await result;

    expect(track).toHaveBeenCalledWith('corporate_access_link_opened', 'ph-distinct-1', {
      valid: true,
      corporate_label: 'Globex',
    });
  });

  it('skips the event rather than inventing an id when PostHog is blocked', async () => {
    getPostHogDistinctId.mockReturnValue(null);

    const { result, setHeader } = runRoute(signCorporateCode({ label: 'Acme AG', validDays: 30 }));

    expect(await result).toEqual(TICKETS);
    expect(cookieFrom(setHeader)).toContain('corporate_handoff=');
    expect(track).not.toHaveBeenCalled();
  });
});
