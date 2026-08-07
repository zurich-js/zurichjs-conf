import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock('@/lib/url', () => ({ getBaseUrl: () => 'http://localhost:3000' }));
vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

import { generateOrderToken } from '@/lib/auth/orderToken';
import { verifyOrderTokenForCurrentTicket } from '@/lib/auth/orderTokenServer';

const TICKET_ID = 'fdd332be-86c9-4842-912c-e5c1c0968606';
const CURRENT_NONCE = '9dc7c037-ef40-4ac5-b24c-66ee9e9ee0f9';
const ROTATED_NONCE = 'ec639162-d93b-49fb-b70d-62b47a5b41be';

describe('verifyOrderTokenForCurrentTicket', () => {
  beforeEach(() => {
    vi.stubEnv('ORDER_TOKEN_SECRET', 'current-secret');
    mocks.createServiceRoleClient.mockReset();
    mocks.from.mockReset();
    mocks.select.mockReset();
    mocks.eq.mockReset();
    mocks.maybeSingle.mockReset();

    const builder = {
      select: mocks.select,
      eq: mocks.eq,
      maybeSingle: mocks.maybeSingle,
    };
    mocks.createServiceRoleClient.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue(builder);
    mocks.select.mockReturnValue(builder);
    mocks.eq.mockReturnValue(builder);
    mocks.maybeSingle.mockResolvedValue({
      data: { manage_token_nonce: CURRENT_NONCE },
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fetches only the current nonce before granting access', async () => {
    const token = generateOrderToken(TICKET_ID, CURRENT_NONCE);

    await expect(verifyOrderTokenForCurrentTicket(token)).resolves.toBe(TICKET_ID);
    expect(mocks.from).toHaveBeenCalledWith('tickets');
    expect(mocks.select).toHaveBeenCalledWith('manage_token_nonce');
    expect(mocks.eq).toHaveBeenCalledWith('id', TICKET_ID);
  });

  it('invalidates a previously valid link after reassignment rotates the nonce', async () => {
    const oldToken = generateOrderToken(TICKET_ID, CURRENT_NONCE);
    mocks.maybeSingle.mockResolvedValue({
      data: { manage_token_nonce: ROTATED_NONCE },
      error: null,
    });

    await expect(verifyOrderTokenForCurrentTicket(oldToken)).resolves.toBeNull();
  });

  it('does not query for a malformed ticket ID', async () => {
    await expect(verifyOrderTokenForCurrentTicket('not-a-uuid.nonce.signature')).resolves.toBeNull();
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it('fails closed when the ticket is missing or the lookup fails', async () => {
    const token = generateOrderToken(TICKET_ID, CURRENT_NONCE);
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(verifyOrderTokenForCurrentTicket(token)).resolves.toBeNull();

    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'database unavailable' } });
    await expect(verifyOrderTokenForCurrentTicket(token)).resolves.toBeNull();
  });
});
