/**
 * Admin Cart Builder Catalog API
 * Returns everything an admin needs to hand-build a cart for a customer:
 * current-stage ticket prices and published workshop offerings for a chosen
 * currency — including sold-out items, since admin-built cart links are the
 * sanctioned way to bypass stock limits case-by-case.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';
import { parseCurrencyParam, type SupportedCurrency } from '@/config/currency';
import {
  getCurrentStage,
  getStockInfo,
  type PriceStage,
  type TicketCategory,
  type StockInfo,
} from '@/config/pricing-stages';
import { getTicketCounts } from '@/lib/tickets/getTicketCounts';
import { createServiceRoleClient } from '@/lib/supabase';
import type { Workshop, WorkshopStatus } from '@/lib/types/database';
import {
  applyCurrencySuffix,
  buildOfferingSummaries,
  getStripeClient,
} from '@/lib/workshops/stripePriceLookup';

const log = logger.scope('Admin Cart Builder Catalog API');

const TICKET_CATEGORIES: TicketCategory[] = ['standard_student_unemployed', 'standard', 'vip'];

const CATEGORY_TITLES: Record<TicketCategory, string> = {
  standard_student_unemployed: 'Student / Unemployed',
  standard: 'Standard',
  vip: 'VIP',
};

export interface CatalogTicket {
  id: TicketCategory;
  title: string;
  /** Unit amount in minor units (cents/centimes). */
  price: number;
  currency: string;
  priceId: string;
  lookupKey: string;
  stage: PriceStage;
  stock: StockInfo;
}

export interface CatalogWorkshop {
  workshopId: string;
  title: string;
  /** Unit amount in minor units (cents/centimes). */
  price: number;
  currency: string;
  priceId: string;
  lookupKey: string;
  capacity: number;
  enrolledCount: number;
  capacityRemaining: number;
  soldOut: boolean;
  room: string | null;
  durationMinutes: number | null;
}

export interface CartBuilderCatalogResponse {
  currency: SupportedCurrency;
  currentStage: PriceStage;
  stageDisplayName: string;
  tickets: CatalogTicket[];
  workshops: CatalogWorkshop[];
  error?: string;
}

const buildTicketLookupKey = (
  category: TicketCategory,
  stage: PriceStage,
  currency: SupportedCurrency
): string => {
  const base =
    category === 'standard_student_unemployed'
      ? 'standard_student_unemployed'
      : `${category}_${stage}`;
  return applyCurrencySuffix(base, currency);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CartBuilderCatalogResponse>
): Promise<void> {
  const emptyResponse = {
    currency: 'CHF' as SupportedCurrency,
    currentStage: 'standard' as PriceStage,
    stageDisplayName: 'Standard',
    tickets: [],
    workshops: [],
  };

  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    res.status(401).json({ ...emptyResponse, error: 'Unauthorized' });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ ...emptyResponse, error: 'Method not allowed' });
    return;
  }

  try {
    const currency = parseCurrencyParam(req.query.currency);
    const stripe = getStripeClient();

    const { counts } = await getTicketCounts();
    const currentStageConfig = getCurrentStage(counts);
    const currentStage = currentStageConfig.stage;

    // Tickets: one Stripe price per category for the current stage.
    const ticketLookupKeys = TICKET_CATEGORIES.map((category) =>
      buildTicketLookupKey(category, currentStage, currency)
    );
    const { data: ticketPrices } = await stripe.prices.list({
      lookup_keys: ticketLookupKeys,
      active: true,
      limit: ticketLookupKeys.length,
    });
    const priceByLookupKey = new Map(
      ticketPrices.filter((p) => p.lookup_key).map((p) => [p.lookup_key as string, p])
    );

    const tickets: CatalogTicket[] = [];
    for (const category of TICKET_CATEGORIES) {
      const lookupKey = buildTicketLookupKey(category, currentStage, currency);
      const price = priceByLookupKey.get(lookupKey);
      if (!price?.unit_amount || !price.currency) continue;

      tickets.push({
        id: category,
        title: CATEGORY_TITLES[category],
        price: price.unit_amount,
        currency: price.currency.toUpperCase(),
        priceId: price.id,
        lookupKey,
        stage: category === 'standard_student_unemployed' ? 'standard' : currentStage,
        stock: counts
          ? getStockInfo(category, currentStage, counts)
          : { remaining: null, total: null, soldOut: false },
      });
    }

    // Workshops: all published offerings with a Stripe lookup key.
    const supabase = createServiceRoleClient();
    const { data: workshopRows, error: workshopsError } = await supabase
      .from('workshops')
      .select('*')
      .eq('status', 'published' satisfies WorkshopStatus)
      .not('stripe_price_lookup_key', 'is', null);

    if (workshopsError) {
      log.error('Failed to load workshops for cart builder', workshopsError);
      res.status(500).json({ ...emptyResponse, currency, error: workshopsError.message });
      return;
    }

    const workshopList = (workshopRows ?? []) as Workshop[];
    const titleByWorkshopId = new Map(workshopList.map((w) => [w.id, w.title]));
    const summaries = await buildOfferingSummaries(stripe, workshopList, currency);

    const workshops: CatalogWorkshop[] = summaries.map((summary) => ({
      workshopId: summary.workshopId,
      title: titleByWorkshopId.get(summary.workshopId) ?? summary.slug,
      price: summary.unitAmount,
      currency: summary.currency,
      priceId: summary.priceId,
      lookupKey: summary.lookupKey,
      capacity: summary.capacity,
      enrolledCount: summary.enrolledCount,
      capacityRemaining: summary.capacityRemaining,
      soldOut: summary.soldOut,
      room: summary.room,
      durationMinutes: summary.durationMinutes,
    }));

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      currency,
      currentStage,
      stageDisplayName: currentStageConfig.displayName,
      tickets,
      workshops,
    });
  } catch (error) {
    log.error('Error building cart builder catalog', error);
    res.status(500).json({
      ...emptyResponse,
      error: error instanceof Error ? error.message : 'Failed to load catalog',
    });
  }
}
