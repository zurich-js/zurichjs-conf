/**
 * Ticket Upgrade Types
 * TypeScript types for the ticket upgrade system (Standard to VIP upgrades)
 */

/**
 * How the upgrade is paid for
 */
export type UpgradeMode = 'complimentary' | 'bank_transfer' | 'stripe';

/**
 * Current status of the upgrade
 * - pending_payment: Stripe payment link created, awaiting payment
 * - pending_bank_transfer: Bank transfer requested, awaiting payment confirmation
 * - completed: Upgrade finalized, ticket tier updated
 * - cancelled: Upgrade cancelled (e.g., payment failed, admin cancelled)
 */
export type UpgradeStatus = 'pending_payment' | 'pending_bank_transfer' | 'completed' | 'cancelled';

/**
 * Database record for a ticket upgrade
 */
export interface TicketUpgrade {
  id: string;
  ticket_id: string;
  from_tier: string;
  to_tier: string;
  upgrade_mode: UpgradeMode;
  status: UpgradeStatus;
  amount: number | null;
  currency: string | null;
  stripe_payment_link_id: string | null;
  stripe_payment_link_url: string | null;
  stripe_checkout_session_id: string | null;
  bank_transfer_reference: string | null;
  bank_transfer_due_date: string | null;
  admin_user_id: string | null;
  admin_note: string | null;
  idempotency_key: string;
  email_sent_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Request payload for initiating a VIP upgrade
 */
export interface UpgradeToVipRequest {
  upgradeMode: UpgradeMode;
  /** Amount in cents, required for non-complimentary */
  amount?: number;
  /** Currency code (CHF, EUR, GBP), required for non-complimentary */
  currency?: string;
  /** Optional admin note for record keeping */
  adminNote?: string;
  /** Due date for bank transfer (ISO date string), required for bank_transfer */
  bankTransferDueDate?: string;
}

/**
 * Response from the upgrade-to-vip API
 */
export interface UpgradeToVipResponse {
  success: boolean;
  upgrade: TicketUpgrade;
  /** Stripe payment URL if upgrade mode is stripe */
  paymentUrl?: string;
  /** Bank transfer details if upgrade mode is bank_transfer */
  bankTransferDetails?: {
    reference: string;
    iban: string;
    accountHolder: string;
    bank: string;
    dueDate: string;
    amount: number;
    currency: string;
  };
  /** Whether an email was sent to the attendee */
  emailSent: boolean;
}

/**
 * Request payload for confirming a bank transfer payment
 */
export interface ConfirmUpgradePaymentRequest {
  upgradeId: string;
  /** Optional reference for the payment (e.g., from bank statement) */
  paymentReference?: string;
}

/**
 * Response from the upgrade-confirm-payment API
 */
export interface ConfirmUpgradePaymentResponse {
  success: boolean;
  upgrade: TicketUpgrade;
}

/**
 * Upgrade info included in order details for attendee-facing pages
 */
export interface PendingUpgradeInfo {
  id: string;
  status: UpgradeStatus;
  upgradeMode: UpgradeMode;
  amount: number | null;
  currency: string | null;
  stripePaymentUrl: string | null;
  bankTransferReference: string | null;
  bankTransferDueDate: string | null;
  createdAt: string;
}

/**
 * VIP perks for display in emails and UI
 */
export const VIP_PERKS = [
  '20% off all workshops (voucher sent when workshops are released, or within 48h after purchase if workshops are already available)',
  'Exclusive speaker tour invitation',
  'Limited edition goodies',
] as const;

/**
 * Bank transfer details for VIP upgrades
 * Same as B2B invoices - PostFinance account
 */
export const BANK_TRANSFER_DETAILS = {
  accountHolder: 'Swiss JavaScript Group',
  address: 'Alderstrasse 30, 8008 Zürich',
  bank: 'PostFinance',
  iban: 'CH27 0900 0000 1670 8701 0',
} as const;

/**
 * Generate idempotency key for a ticket upgrade
 * Ensures only one active upgrade per ticket
 */
export function generateUpgradeIdempotencyKey(ticketId: string): string {
  return `${ticketId}:vip-upgrade`;
}

/**
 * Generate a unique bank transfer reference for an upgrade
 */
export function generateBankTransferReference(upgradeId: string): string {
  // Use first 8 chars of upgrade ID + random suffix for readability
  const shortId = upgradeId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `VIP-${shortId}`;
}
