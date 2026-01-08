/**
 * Sponsorship Statistics
 * Aggregate data for dashboard displays
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type { SponsorshipStats, SponsorshipDealStatus } from '@/lib/types/sponsorship';

/**
 * Get sponsorship statistics for the dashboard
 *
 * @returns Aggregate sponsorship statistics
 */
export async function getSponsorshipStats(): Promise<SponsorshipStats> {
  const supabase = createServiceRoleClient();

  // Get total sponsors count
  const { count: totalSponsors, error: sponsorsError } = await supabase
    .from('sponsors')
    .select('id', { count: 'exact', head: true });

  if (sponsorsError) {
    throw new Error(`Failed to count sponsors: ${sponsorsError.message}`);
  }

  // Get public logos count
  const { count: publicLogos, error: publicLogosError } = await supabase
    .from('sponsors')
    .select('id', { count: 'exact', head: true })
    .eq('is_logo_public', true)
    .not('logo_url', 'is', null);

  if (publicLogosError) {
    throw new Error(`Failed to count public logos: ${publicLogosError.message}`);
  }

  // Get all deals with their invoices for aggregation
  const { data: deals, error: dealsError } = await supabase
    .from('sponsorship_deals')
    .select(`
      id,
      status,
      tier_id,
      currency,
      sponsorship_invoices(total_amount)
    `);

  if (dealsError) {
    throw new Error(`Failed to fetch deals: ${dealsError.message}`);
  }

  // Initialize counters
  const dealsByStatus: Record<SponsorshipDealStatus, number> = {
    draft: 0,
    offer_sent: 0,
    invoiced: 0,
    invoice_sent: 0,
    paid: 0,
    cancelled: 0,
  };

  const dealsByTier: Record<string, number> = {};

  const revenueByCurrency = {
    CHF: { paid: 0, pending: 0 },
    EUR: { paid: 0, pending: 0 },
  };

  // Process deals
  for (const deal of deals || []) {
    // Count by status
    const status = deal.status as SponsorshipDealStatus;
    dealsByStatus[status]++;

    // Count by tier
    const tierId = deal.tier_id;
    dealsByTier[tierId] = (dealsByTier[tierId] || 0) + 1;

    // Get invoice amount if exists
    const invoices = deal.sponsorship_invoices as Array<{ total_amount: number }> | null;
    const invoiceAmount = invoices?.[0]?.total_amount || 0;

    // Track revenue
    const currency = deal.currency as 'CHF' | 'EUR';
    if (status === 'paid') {
      revenueByCurrency[currency].paid += invoiceAmount;
    } else if (['invoiced', 'invoice_sent'].includes(status)) {
      revenueByCurrency[currency].pending += invoiceAmount;
    }
  }

  return {
    totalSponsors: totalSponsors || 0,
    totalDeals: deals?.length || 0,
    dealsByStatus,
    dealsByTier,
    revenueByCurrency,
    publicLogos: publicLogos || 0,
  };
}
