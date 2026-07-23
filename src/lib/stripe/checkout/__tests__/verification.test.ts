import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';

const mocks = vi.hoisted(() => ({
  supabaseFrom: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: mocks.supabaseFrom,
  })),
}));

import { linkVerificationPurchase } from '../verification';

function makeLog() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as Parameters<typeof linkVerificationPurchase>[1];
}

function makeSession(metadata: Record<string, string> | null): Stripe.Checkout.Session {
  return {
    id: 'cs_test_123',
    metadata,
  } as unknown as Stripe.Checkout.Session;
}

function mockUpdateChain(result: { data: unknown; error: unknown }) {
  const select = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));
  mocks.supabaseFrom.mockReturnValue({ update });
  return { update, eq, select };
}

describe('linkVerificationPurchase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when the session has no verification_id metadata', async () => {
    const log = makeLog();
    await linkVerificationPurchase(makeSession({ customer_name: 'Anna' }), log);
    await linkVerificationPurchase(makeSession(null), log);

    expect(mocks.supabaseFrom).not.toHaveBeenCalled();
  });

  it('writes the session id onto the verification request', async () => {
    const { update, eq } = mockUpdateChain({ data: [{ id: 'ver-uuid' }], error: null });
    const log = makeLog();

    await linkVerificationPurchase(
      makeSession({ verification_id: 'ver-uuid', type: 'student_verification' }),
      log
    );

    expect(mocks.supabaseFrom).toHaveBeenCalledWith('verification_requests');
    expect(update).toHaveBeenCalledWith({ stripe_session_id: 'cs_test_123' });
    expect(eq).toHaveBeenCalledWith('id', 'ver-uuid');
    expect(log.info).toHaveBeenCalled();
  });

  it('warns (does not throw) when the verification request does not exist', async () => {
    mockUpdateChain({ data: [], error: null });
    const log = makeLog();

    await expect(
      linkVerificationPurchase(makeSession({ verification_id: 'missing' }), log)
    ).resolves.toBeUndefined();
    expect(log.warn).toHaveBeenCalled();
  });

  it('logs (does not throw) on a database error', async () => {
    mockUpdateChain({ data: null, error: { message: 'db down' } });
    const log = makeLog();

    await expect(
      linkVerificationPurchase(makeSession({ verification_id: 'ver-uuid' }), log)
    ).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalled();
  });
});
