/**
 * Manage Order Component Types
 */

import type { OrderDetailsResponse } from '@/pages/api/orders/[token]';

export type { OrderDetailsResponse };

export interface TicketData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company?: string | null;
  job_title?: string | null;
  ticket_category: string;
  ticket_stage: string;
  amount_paid: number;
  currency: string;
  created_at: string;
  status: string;
  qr_code_url?: string | null;
}

export interface PendingUpgrade {
  upgradeMode: 'stripe' | 'bank_transfer' | 'complimentary';
  amount?: number | null;
  currency?: string | null;
  stripePaymentLinkUrl?: string | null;
  bankTransferReference?: string | null;
  bankTransferDueDate?: string | null;
}

export interface TransferInfo {
  transferredFrom: string;
  transferredFromEmail: string;
  transferredAt: string;
}

export interface ReassignData {
  email: string;
  firstName: string;
  lastName: string;
}
