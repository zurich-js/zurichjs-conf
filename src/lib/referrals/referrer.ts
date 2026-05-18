/**
 * Referrer Management
 * Create referrer profiles and generate referral codes
 */

import crypto from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import type { Referrer } from './types';

const log = logger.scope('Referrals');

const MAX_CODE_RETRIES = 3;

/**
 * Generate a cryptographically random referral code
 * Format: REF-{8 random alphanumeric chars, uppercase}
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `REF-${code}`;
}

/**
 * Create a referrer profile for a ticket holder
 * Retries on code collision (up to 3 times)
 */
export async function createReferrer(
  ticketId: string,
  email: string,
  firstName: string,
  lastName: string
): Promise<Referrer> {
  const supabase = createServiceRoleClient();

  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
    const code = generateReferralCode();

    const { data, error } = await (supabase.from as any)('referrers')
      .insert({
        ticket_id: ticketId,
        email: email.toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        referral_code: code,
      })
      .select()
      .single();

    if (error) {
      // Unique constraint violation — retry with a new code
      if (error.code === '23505' && error.message?.includes('referral_code')) {
        log.warn('Referral code collision, retrying', { code, attempt });
        continue;
      }
      // Duplicate ticket_id — referrer already exists, return it
      if (error.code === '23505' && error.message?.includes('ticket_id')) {
        const existing = await getReferrerByTicketId(ticketId);
        if (existing) return existing;
      }
      log.error('Failed to create referrer', error, { ticketId });
      throw new Error(`Failed to create referrer: ${error.message}`);
    }

    log.info('Referrer created', { referralCode: code, ticketId, email });
    return data as Referrer;
  }

  throw new Error('Failed to generate unique referral code after retries');
}

/**
 * Look up a referrer by their referral code
 */
export async function getReferrerByCode(code: string): Promise<Referrer | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await (supabase.from as any)('referrers')
    .select('*')
    .eq('referral_code', code.toUpperCase())
    .maybeSingle();

  if (error) {
    log.error('Failed to look up referrer by code', error, { code });
    return null;
  }

  return data as Referrer | null;
}

/**
 * Look up a referrer by their ticket ID
 */
export async function getReferrerByTicketId(ticketId: string): Promise<Referrer | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await (supabase.from as any)('referrers')
    .select('*')
    .eq('ticket_id', ticketId)
    .maybeSingle();

  if (error) {
    log.error('Failed to look up referrer by ticket', error, { ticketId });
    return null;
  }

  return data as Referrer | null;
}

/**
 * Look up a referrer by their email
 */
export async function getReferrerByEmail(email: string): Promise<Referrer | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await (supabase.from as any)('referrers')
    .select('*')
    .eq('email', email.toLowerCase())
    .limit(1)
    .maybeSingle();

  if (error) {
    log.error('Failed to look up referrer by email', error, { email });
    return null;
  }

  return data as Referrer | null;
}
