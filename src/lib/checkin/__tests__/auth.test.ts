/**
 * Tests for the door sign-in gate.
 *
 * The property under test is the one that matters for an unauthenticated public
 * endpoint: `signInWithOtp` CREATES a Supabase auth user for any address it is
 * handed. Without the allow-list check in front of it, `/api/checkin/auth/login`
 * is an account factory that also puts strangers' addresses in the auth table.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DoorStaff } from '@/lib/types/checkin';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BASE_URL ??= 'https://example.com';
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'test-publishable-key';
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??= 'pk_test_123';
});

const mocks = vi.hoisted(() => ({
  getStaffByEmail: vi.fn(),
  signInWithOtp: vi.fn(),
}));

vi.mock('../staff', () => ({ getStaffByEmail: mocks.getStaffByEmail }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { signInWithOtp: mocks.signInWithOtp } }),
}));

const { sendDoorMagicLink } = await import('../auth');

const STAFF: DoorStaff = {
  id: 'staff-1',
  email: 'vol@example.com',
  name: 'Vol',
  role: 'scanner',
  isActive: true,
  invitedAt: '2026-09-01T00:00:00.000Z',
  invitedBy: null,
  acceptedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signInWithOtp.mockResolvedValue({ error: null });
});

describe('sendDoorMagicLink', () => {
  it('sends to an invited volunteer', async () => {
    mocks.getStaffByEmail.mockResolvedValue(STAFF);

    const result = await sendDoorMagicLink('vol@example.com');

    expect(result).toEqual({ sent: true, error: null });
    expect(mocks.signInWithOtp).toHaveBeenCalledTimes(1);
  });

  it('never calls Supabase for an address that is not on the crew', async () => {
    // The whole point. signInWithOtp would create an auth user for this address.
    mocks.getStaffByEmail.mockResolvedValue(null);

    const result = await sendDoorMagicLink('stranger@example.com');

    expect(mocks.signInWithOtp).not.toHaveBeenCalled();
    // Not an error: the API answers identically either way, so the endpoint
    // cannot be used to test who is a volunteer.
    expect(result).toEqual({ sent: false, error: null });
  });

  it('normalises the address before the allow-list check', async () => {
    // checkin_staff has a CHECK constraint requiring lowercase, so a mixed-case
    // lookup would miss and lock the volunteer out of their own invitation.
    mocks.getStaffByEmail.mockResolvedValue(STAFF);

    await sendDoorMagicLink('Vol@Example.COM');

    expect(mocks.getStaffByEmail).toHaveBeenCalledWith('vol@example.com');
    expect(mocks.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'vol@example.com' })
    );
  });

  it('sends the volunteer to the door callback, not the CFP one', async () => {
    // Landing on /cfp/reviewer/auth/callback would try to claim a reviewer
    // invitation and fail with an error about the wrong system entirely.
    mocks.getStaffByEmail.mockResolvedValue(STAFF);

    await sendDoorMagicLink('vol@example.com');

    expect(mocks.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { emailRedirectTo: 'https://example.com/checkin/auth/callback' },
      })
    );
  });

  it('reports a transport failure rather than swallowing it', async () => {
    // Silence here would be indistinguishable from "you are not on the crew",
    // which is the one diagnosis a volunteer cannot act on.
    mocks.getStaffByEmail.mockResolvedValue(STAFF);
    mocks.signInWithOtp.mockResolvedValue({ error: { message: 'rate limit exceeded' } });

    expect(await sendDoorMagicLink('vol@example.com')).toEqual({
      sent: false,
      error: 'rate limit exceeded',
    });
  });

  it('survives the auth client throwing', async () => {
    mocks.getStaffByEmail.mockResolvedValue(STAFF);
    mocks.signInWithOtp.mockRejectedValue(new Error('network down'));

    const result = await sendDoorMagicLink('vol@example.com');

    expect(result.sent).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
