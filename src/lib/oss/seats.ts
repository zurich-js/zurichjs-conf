/**
 * OSS maintainer seat accounting.
 *
 * Seats are reserved at admin approval time (not at submission). They include
 * both approved-and-paid and approved-but-pending-payment requests, so a slow
 * payer doesn't squeeze out another applicant. The 72h payment-link expiry
 * lets us reclaim seats from cold leads via a scheduled job.
 */

import { createServiceRoleClient } from '@/lib/supabase';

export const OSS_MAINTAINER_SEAT_CAP = 30;

export interface OssSeatInfo {
  cap: number;
  reserved: number;
  remaining: number;
  soldOut: boolean;
}

/**
 * Returns current OSS seat usage. Counts all approved OSS verification
 * requests — these consume seats whether the user has paid yet or not.
 */
export async function getOssSeatInfo(): Promise<OssSeatInfo> {
  const supabase = createServiceRoleClient();
  const { count } = await supabase
    .from('verification_requests')
    .select('id', { count: 'exact', head: true })
    .eq('verification_type', 'oss_maintainer')
    .eq('status', 'approved');

  const reserved = count ?? 0;
  return {
    cap: OSS_MAINTAINER_SEAT_CAP,
    reserved,
    remaining: Math.max(0, OSS_MAINTAINER_SEAT_CAP - reserved),
    soldOut: reserved >= OSS_MAINTAINER_SEAT_CAP,
  };
}
