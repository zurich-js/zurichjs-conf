/**
 * Shared types for the Admin Dashboard components
 */

export interface TicketMetadata {
  issuedManually?: boolean;
  issuedAt?: string;
  paymentType?: 'complimentary' | 'stripe' | 'bank_transfer';
  complimentaryReason?: string;
  stripePaymentId?: string;
  bankTransferReference?: string;
  // Session metadata from Stripe checkout (captured at purchase time)
  session_metadata?: {
    country?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    addressLine1?: string;
    addressLine2?: string;
    company?: string;
    jobTitle?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface Ticket {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  ticket_type: string;
  ticket_category: string;
  ticket_stage: string;
  amount_paid: number;
  currency: string;
  status: string;
  stripe_payment_intent_id?: string;
  stripe_session_id?: string;
  stripe_customer_id?: string;
  company?: string;
  job_title?: string;
  qr_code_url?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: TicketMetadata;
}

export interface FinancialData {
  summary: {
    grossRevenue: number;
    totalStripeFees: number;
    netRevenue: number;
    totalRevenue: number;
    confirmedTickets: number;
    totalRefunded: number;
    refundedTickets: number;
    totalTickets: number;
  };
  byCategory: Record<string, { revenue: number; count: number }>;
  byStage: Record<string, { revenue: number; count: number }>;
  revenueBreakdown: {
    individual: {
      total: { count: number; revenue: number; fees: number };
      stripe: { count: number; revenue: number; fees: number };
      bank_transfer: { count: number; revenue: number; fees: number };
    };
    b2b: {
      total: { count: number; revenue: number; fees: number };
      stripe: { count: number; revenue: number; fees: number };
      bank_transfer: { count: number; revenue: number; fees: number };
    };
    complimentary: { count: number };
  };
  b2bSummary: {
    totalInvoices: number;
    paidInvoices: number;
    pendingInvoices: number;
    draftInvoices: number;
    paidRevenue: number;
    pendingRevenue: number;
  };
  sponsorshipSummary?: {
    totalDeals: number;
    paidDeals: number;
    pendingDeals: number;
    revenueByCurrency: {
      CHF: { paid: number; pending: number };
      EUR: { paid: number; pending: number };
    };
    byTier: Record<string, { count: number; revenueCHF: number; revenueEUR: number }>;
  };
  purchasesTimeSeries: Array<{
    date: string;
    count: number;
    revenue: number;
    cumulative: number;
    cumulativeRevenue: number;
  }>;
}

export interface StripePaymentDetails {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customerEmail: string | null;
  customerName: string | null;
  description: string | null;
  created: number;
  metadata: Record<string, string>;
}

export interface ToastMessage {
  type: 'success' | 'error';
  text: string;
}

export type SortField = 'created_at' | 'first_name' | 'email' | 'amount_paid' | 'status' | 'ticket_category';
export type SortDirection = 'asc' | 'desc';
export type Tab = 'tickets' | 'issue' | 'financials' | 'b2b';
