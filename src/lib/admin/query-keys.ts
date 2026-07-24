/**
 * Query key factory for the admin dashboard.
 *
 * All admin server-state lives under the `['admin']` root so related caches
 * can be reasoned about (and cleared on logout) as one family. Keys are
 * hierarchical: every input that changes the server response (filters,
 * search, ids, currency) must be part of the key.
 *
 * Admin CFP keys predate this factory and live in
 * `src/lib/types/cfp-admin.ts` (`cfpQueryKeys`, rooted at `['cfp']`);
 * cfp-travel keys live in `src/components/admin/cfp-travel/api.ts`
 * (rooted at `['admin', 'travel']`, compatible with this hierarchy).
 */

import type { SupportedCurrency } from '@/config/currency';

export interface AdminVerificationListParams {
  /** Empty string = all statuses */
  status: '' | 'pending' | 'approved' | 'rejected';
}

export interface AdminB2BInvoiceListParams {
  /** Empty string = all statuses */
  status: string;
  /** Server-side search term (debounced by the caller) */
  search: string;
}

export const adminKeys = {
  all: ['admin'] as const,

  auth: () => [...adminKeys.all, 'auth'] as const,

  /** Tickets domain (admin dashboard "Tickets" tab + ticket modals) */
  tickets: () => [...adminKeys.all, 'tickets'] as const,
  ticketList: () => [...adminKeys.tickets(), 'list'] as const,
  ticketInvoice: (ticketId: string) => [...adminKeys.tickets(), 'invoice', ticketId] as const,
  ticketSpend: (ticketId: string) => [...adminKeys.tickets(), 'spend', ticketId] as const,

  /** Financial overview — expensive aggregate, cache generously */
  financials: () => [...adminKeys.all, 'financials'] as const,

  /** Student/unemployed verification requests */
  verifications: () => [...adminKeys.all, 'verifications'] as const,
  verificationList: (params: AdminVerificationListParams) =>
    [...adminKeys.verifications(), 'list', params] as const,

  /** Workshop offerings + registrants */
  workshops: () => [...adminKeys.all, 'workshops'] as const,
  workshopList: () => [...adminKeys.workshops(), 'list'] as const,
  workshopRegistrants: (workshopId: string) =>
    [...adminKeys.workshops(), 'registrants', workshopId] as const,
  workshopOfferings: (sessionId: string) =>
    [...adminKeys.workshops(), 'offering', sessionId] as const,

  /** B2B invoices */
  b2b: () => [...adminKeys.all, 'b2b'] as const,
  b2bInvoiceList: (params: AdminB2BInvoiceListParams) =>
    [...adminKeys.b2b(), 'invoices', 'list', params] as const,
  b2bInvoice: (invoiceId: string) => [...adminKeys.b2b(), 'invoices', 'detail', invoiceId] as const,
  b2bWorkshops: () => [...adminKeys.b2b(), 'workshops'] as const,

  /** VIP perks tab */
  vipPerks: () => [...adminKeys.all, 'vip-perks'] as const,
  vipPerkList: () => [...adminKeys.vipPerks(), 'list'] as const,
  vipPerkStats: () => [...adminKeys.vipPerks(), 'stats'] as const,
  vipPerkConfig: () => [...adminKeys.vipPerks(), 'config'] as const,
  vipPerkProducts: () => [...adminKeys.vipPerks(), 'products'] as const,

  /** Apparel tab */
  apparel: () => [...adminKeys.all, 'apparel'] as const,
  apparelOverview: () => [...adminKeys.apparel(), 'overview'] as const,

  /** Cart-builder catalog (Stripe prices + workshops), currency-scoped */
  cartBuilderCatalog: (currency: SupportedCurrency) =>
    [...adminKeys.all, 'cart-builder', 'catalog', currency] as const,
} as const;
