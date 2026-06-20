/**
 * Referral Config
 * Reads the singleton referral_config from Supabase
 */

import { createServiceRoleClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import type { ReferralConfig, ReferralTier } from './types';
import { referralTierSchema } from './types';
import { z } from 'zod';

const log = logger.scope('Referral Config');

export async function getReferralConfig(): Promise<ReferralConfig> {
  const supabase = createServiceRoleClient();
  // Use (supabase.from as any) because the table isn't in generated types yet
  const { data, error } = await (supabase.from as any)('referral_config')
    .select('*')
    .limit(1)
    .single();

  if (error || !data) {
    log.error('Failed to fetch referral config', error);
    throw new Error('Referral config not found');
  }

  // Validate tiers
  const tiersResult = z.array(referralTierSchema).safeParse(data.tiers);
  if (!tiersResult.success) {
    log.error('Invalid referral tiers config', tiersResult.error);
    throw new Error('Invalid referral tiers configuration');
  }

  return { ...data, tiers: tiersResult.data } as ReferralConfig;
}

/**
 * Get the reward amount for a given referral count and currency
 */
export function getRewardForTier(
  tiers: ReferralTier[],
  referralCount: number,
  currency: string
): { tier: number; amount: number } {
  const currencyKey = `reward_amount_${currency.toLowerCase()}` as keyof ReferralTier;

  for (let i = tiers.length - 1; i >= 0; i--) {
    const tier = tiers[i];
    if (referralCount >= tier.min_referrals && (tier.max_referrals === null || referralCount <= tier.max_referrals)) {
      const amount = tier[currencyKey] as number;
      if (typeof amount !== 'number') {
        // Fallback to CHF if currency not found
        return { tier: i + 1, amount: tier.reward_amount_chf };
      }
      return { tier: i + 1, amount };
    }
  }

  // Default to first tier
  const amount = (tiers[0][currencyKey] as number) ?? tiers[0].reward_amount_chf;
  return { tier: 1, amount };
}
