/**
 * Ticket Stock Admin Types
 */

import type { Database } from '@/lib/types/database';
import type { StockInfo, TicketCategory } from '@/config/pricing-stages';

/** Full ticket_stock_config row as returned by /api/admin/tickets/stock-config */
export type TicketStockConfigRow = Database['public']['Tables']['ticket_stock_config']['Row'];

/** Editable fields for the PUT request. `standard_limit: null` turns the cap off. */
export interface TicketStockConfigUpdateInput {
  vip_limit?: number;
  student_unemployed_limit?: number;
  standard_limit?: number | null;
}

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
  /** false = the sold-ticket query failed and every count below is zeroed */
  countsAvailable: boolean;
  /** Confirmed tickets across every category — what the total cap is measured against */
  totalSold: number;
  categories: TicketStockCategoryStatus[];
}
