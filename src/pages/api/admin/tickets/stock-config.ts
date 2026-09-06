/**
 * Ticket Stock Config Admin API
 * GET/PUT /api/admin/tickets/stock-config — Read/update the ticket stock
 * limits (singleton ticket_stock_config row).
 *
 * GET also returns the live confirmed-ticket counts and the resulting
 * remaining stock per category, so the admin dashboard shows the same numbers
 * the public ticket page computes rather than re-deriving them client-side.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/admin/auth';
import {
  getTicketStockConfigRow,
  updateTicketStockConfigRow,
} from '@/lib/tickets/stock-config';
import { getTicketCounts } from '@/lib/tickets/getTicketCounts';
import {
  emptyStockCounts,
  getCurrentStage,
  getStockInfo,
  getTotalTicketsSold,
  type StockInfo,
  type TicketCategory,
} from '@/config/pricing-stages';
import { logger } from '@/lib/logger';
import type { TicketStockConfigRow } from '@/lib/tickets/stock-config';

const log = logger.scope('Ticket Stock Config API');

const CATEGORIES: TicketCategory[] = ['standard_student_unemployed', 'standard', 'vip'];

/**
 * `standard_limit` is nullable — null means the total-attendee cap is off. The
 * limits are intentionally allowed to sit below what is already sold: an
 * organiser reducing capacity needs to be able to say so, and the resulting
 * negative headroom is surfaced in the response rather than clamped away.
 */
const updateConfigSchema = z.object({
  vip_limit: z.number().int().min(0).max(100000).optional(),
  student_unemployed_limit: z.number().int().min(0).max(100000).optional(),
  standard_limit: z.number().int().min(0).max(100000).nullable().optional(),
});

export interface TicketStockCategoryStatus {
  category: TicketCategory;
  title: string;
  /** Confirmed tickets in this category */
  sold: number;
  /** The stock the public ticket page reports for this category */
  stock: StockInfo;
}

export interface TicketStockConfigResponse {
  config: TicketStockConfigRow;
  /** Whether the confirmed-ticket counts could be read; false = counts are zeroed */
  countsAvailable: boolean;
  /** Confirmed tickets across every category — what standard_limit is measured against */
  totalSold: number;
  categories: TicketStockCategoryStatus[];
}

const CATEGORY_TITLES: Record<TicketCategory, string> = {
  standard_student_unemployed: 'Student / Unemployed',
  standard: 'Standard',
  vip: 'VIP',
};

async function buildResponse(config: TicketStockConfigRow): Promise<TicketStockConfigResponse> {
  const { counts } = await getTicketCounts();
  const resolvedCounts = counts ?? emptyStockCounts();
  const currentStage = getCurrentStage(counts).stage;
  const limits = {
    vip: config.vip_limit,
    student_unemployed: config.student_unemployed_limit,
    standard_total: config.standard_limit,
  };

  return {
    config,
    countsAvailable: Boolean(counts),
    totalSold: getTotalTicketsSold(resolvedCounts),
    categories: CATEGORIES.map((category) => ({
      category,
      title: CATEGORY_TITLES[category],
      sold: resolvedCounts.byCategory[category] || 0,
      stock: getStockInfo(category, currentStage, resolvedCounts, limits),
    })),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const config = await getTicketStockConfigRow();
      return res.status(200).json(await buildResponse(config));
    }

    if (req.method === 'PUT') {
      const parsed = updateConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
      }

      const config = await updateTicketStockConfigRow(parsed.data);
      return res.status(200).json(await buildResponse(config));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    log.error('Ticket stock config API error', error as Error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
