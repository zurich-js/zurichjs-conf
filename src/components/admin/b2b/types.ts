/**
 * B2B Orders - Shared types and utilities
 */

import type { B2BInvoiceStatus } from '@/lib/types/b2b';

export const statusColors: Record<B2BInvoiceStatus, string> = {
  draft: 'bg-gray-200 text-gray-900',
  sent: 'bg-blue-200 text-blue-900',
  paid: 'bg-green-200 text-green-900',
  cancelled: 'bg-red-200 text-red-900',
};

export function formatAmount(cents: number, currency: string = 'CHF'): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-CH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export const ITEMS_PER_PAGE = 10;

export interface B2BSummaryStats {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  totalValue: number;
}
