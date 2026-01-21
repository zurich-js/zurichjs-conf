/**
 * Sponsorship Status Types
 * Status transitions, validation, and display configuration
 */

import type { SponsorshipDealStatus, SponsorshipPerkStatus } from './base';

/**
 * Valid deal status transitions
 * Maps current status to allowed next statuses
 */
export const VALID_DEAL_STATUS_TRANSITIONS: Record<
  SponsorshipDealStatus,
  SponsorshipDealStatus[]
> = {
  draft: ['offer_sent', 'cancelled'],
  offer_sent: ['invoiced', 'cancelled'],
  invoiced: ['invoice_sent', 'cancelled'],
  invoice_sent: ['paid', 'cancelled'],
  paid: [], // Final state - no transitions allowed
  cancelled: [], // Final state - no transitions allowed
};

/**
 * Check if a deal status transition is valid
 */
export function isValidDealStatusTransition(
  currentStatus: SponsorshipDealStatus,
  newStatus: SponsorshipDealStatus
): boolean {
  return VALID_DEAL_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}

/**
 * Status display configuration
 */
export const DEAL_STATUS_CONFIG: Record<
  SponsorshipDealStatus,
  { label: string; color: string; bgColor: string }
> = {
  draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  offer_sent: { label: 'Offer Sent', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  invoiced: { label: 'Invoiced', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  invoice_sent: { label: 'Invoice Sent', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  paid: { label: 'Paid', color: 'text-green-700', bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100' },
};

/**
 * Perk status display configuration
 */
export const PERK_STATUS_CONFIG: Record<
  SponsorshipPerkStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: { label: 'Pending', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  in_progress: { label: 'In Progress', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  not_applicable: { label: 'N/A', color: 'text-gray-500', bgColor: 'bg-gray-50' },
};
