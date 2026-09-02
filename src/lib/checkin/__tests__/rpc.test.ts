/**
 * The door RPC boundary.
 *
 * The binding test exists because of a production outage: `supabase.rpc` was
 * detached from the client (`const invoke = supabase.rpc as ...`), which loses
 * `this` and crashes inside supabase-js with "Cannot read properties of
 * undefined (reading 'rest')" on EVERY door call. The mock client below fails
 * the same way a real one does when `rpc` is invoked unbound, so a regression
 * fails these tests instead of the conference door.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { doorCurrentOccasion, doorResolve } from '../rpc';
import { DoorRpcError } from '../errors';

const mocks = vi.hoisted(() => ({
  rpcImpl: vi.fn(),
}));

vi.mock('@/lib/supabase', () => {
  // Mirrors the real SupabaseClient: `rpc` reads state off `this`, so calling
  // it detached throws exactly like production did.
  class FakeClient {
    rest = { rpc: mocks.rpcImpl };
    rpc(name: string, params: Record<string, unknown>) {
      return this.rest.rpc(name, params);
    }
  }
  return { createServiceRoleClient: () => new FakeClient() };
});

beforeEach(() => {
  mocks.rpcImpl.mockReset();
});

describe('callDoorRpc binding', () => {
  it('invokes rpc with the client bound (no "reading \'rest\'" TypeError)', async () => {
    mocks.rpcImpl.mockResolvedValue({ data: 'conference_day', error: null });

    await expect(doorCurrentOccasion()).resolves.toBe('conference_day');
    // Functions with Args: never are called without a second argument.
    expect(mocks.rpcImpl).toHaveBeenCalledWith('door_current_occasion', undefined);
  });
});

describe('door RPC error contract', () => {
  it('throws DoorRpcError carrying the PostgREST failure as cause', async () => {
    mocks.rpcImpl.mockResolvedValue({
      data: null,
      error: { message: 'function door_resolve does not exist', code: '42883' },
    });

    const thrown = await doorResolve('abc').catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(DoorRpcError);
    const err = thrown as DoorRpcError;
    // Clean PostHog title: the class name plus which function failed.
    expect(err.name).toBe('DoorRpcError');
    expect(err.message).toContain('door_resolve');
    expect(err.code).toBe('42883');
    expect(err.fingerprint).toBe('door-rpc:door_resolve');
    expect((err.cause as { code: string }).code).toBe('42883');
  });

  it('throws DoorRpcError on a null payload', async () => {
    mocks.rpcImpl.mockResolvedValue({ data: null, error: null });

    await expect(doorResolve('abc')).rejects.toThrow(/door_resolve failed: returned no payload/);
  });

  it('accepts the warm-up meetup as a server-derived occasion', async () => {
    mocks.rpcImpl.mockResolvedValue({ data: 'community_day', error: null });

    await expect(doorCurrentOccasion()).resolves.toBe('community_day');
  });

  it('rejects an occasion value outside the contract', async () => {
    mocks.rpcImpl.mockResolvedValue({ data: 'gala_day', error: null });

    await expect(doorCurrentOccasion()).rejects.toThrow(/unknown occasion/);
  });
});
