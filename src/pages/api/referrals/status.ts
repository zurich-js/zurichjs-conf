/**
 * Referral Status API
 * Returns the referrer's stats, active voucher, and conversion history.
 * Auth: session-based — returns data for the authenticated user's email.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient } from '@/lib/cfp/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const log = logger.scope('Referral Status API');

interface ReferralStatusResponse {
  referralCode: string | null;
  totalReferrals: number;
  currentTier: number;
  activeVoucher: {
    code: string | null;
    amount: number;
    currency: string | null;
    redeemed: boolean;
  } | null;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReferralStatusResponse>
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({
      referralCode: null, totalReferrals: 0, currentTier: 0, activeVoucher: null,
      error: 'Method not allowed',
    });
    return;
  }

  try {
    const supabase = createSupabaseApiClient(req, res);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      res.status(401).json({
        referralCode: null, totalReferrals: 0, currentTier: 0, activeVoucher: null,
        error: 'Unauthorized',
      });
      return;
    }

    const email = session.user.email;
    if (!email) {
      res.status(400).json({
        referralCode: null, totalReferrals: 0, currentTier: 0, activeVoucher: null,
        error: 'No email in session',
      });
      return;
    }

    const serviceClient = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: referrer, error } = await (serviceClient.from as any)('referrers')
      .select('*')
      .eq('email', email.toLowerCase())
      .limit(1)
      .maybeSingle();

    if (error) {
      log.error('Failed to fetch referrer status', error, { email });
      res.status(500).json({
        referralCode: null, totalReferrals: 0, currentTier: 0, activeVoucher: null,
        error: 'Failed to fetch referral status',
      });
      return;
    }

    if (!referrer) {
      res.status(200).json({
        referralCode: null, totalReferrals: 0, currentTier: 0, activeVoucher: null,
      });
      return;
    }

    res.status(200).json({
      referralCode: referrer.referral_code,
      totalReferrals: referrer.total_referrals,
      currentTier: referrer.current_tier,
      activeVoucher: referrer.active_voucher_amount > 0 ? {
        code: referrer.active_voucher_code,
        amount: referrer.active_voucher_amount,
        currency: referrer.active_voucher_currency,
        redeemed: referrer.active_voucher_redeemed,
      } : null,
    });
  } catch (error) {
    log.error('Error fetching referral status', error);
    res.status(500).json({
      referralCode: null, totalReferrals: 0, currentTier: 0, activeVoucher: null,
      error: 'Internal server error',
    });
  }
}
