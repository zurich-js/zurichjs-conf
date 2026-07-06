/**
 * B2B Invoice Workshops API
 * GET /api/admin/b2b-invoices/workshops - List published workshop offerings
 * that can be added to a B2B invoice, with their default CHF seat price.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getPublishedWorkshops } from '@/lib/workshops/getWorkshops';
import { getStripeClient, buildOfferingSummaries } from '@/lib/workshops/stripePriceLookup';
import { logger } from '@/lib/logger';

const log = logger.scope('B2B Invoice Workshops API');

export interface B2BAvailableWorkshop {
  id: string;
  title: string;
  /** Default seat price in cents (CHF), null when no Stripe price is configured */
  unitPrice: number | null;
  capacity: number;
  enrolledCount: number;
  capacityRemaining: number;
}

export interface B2BAvailableWorkshopsResponse {
  workshops: B2BAvailableWorkshop[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await getPublishedWorkshops();
    if (!result.success || !result.workshops) {
      return res.status(500).json({ error: result.error || 'Failed to load workshops' });
    }

    // Resolve default CHF prices from Stripe. Price lookup failures shouldn't
    // block invoice creation — the admin can type the negotiated price anyway.
    const priceByWorkshopId = new Map<string, number>();
    try {
      const stripe = getStripeClient();
      const summaries = await buildOfferingSummaries(stripe, result.workshops, 'CHF');
      for (const summary of summaries) {
        priceByWorkshopId.set(summary.workshopId, summary.unitAmount);
      }
    } catch (error) {
      log.warn('Stripe price lookup failed, returning workshops without default prices', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    const workshops: B2BAvailableWorkshop[] = result.workshops.map((workshop) => {
      const capacity = workshop.capacity ?? 0;
      const enrolledCount = workshop.enrolled_count ?? 0;
      return {
        id: workshop.id,
        title: workshop.title,
        unitPrice: priceByWorkshopId.get(workshop.id) ?? null,
        capacity,
        enrolledCount,
        capacityRemaining: Math.max(0, capacity - enrolledCount),
      };
    });

    const response: B2BAvailableWorkshopsResponse = { workshops };
    return res.status(200).json(response);
  } catch (error) {
    log.error('Error listing workshops for B2B invoices', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list workshops',
    });
  }
}
