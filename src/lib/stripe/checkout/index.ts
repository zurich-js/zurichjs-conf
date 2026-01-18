/**
 * Checkout Processing Modules
 * Barrel export for checkout-related functionality
 */

export { processVouchers } from './vouchers';
export { processTickets } from './tickets';
export type { AttendeeInfo, TicketCreationResult } from './tickets';
export { handleVipUpgradePayment } from './vip-upgrade';
export {
  categorizeLineItems,
  cancelAbandonmentEmails,
  getOrCreateStripeCustomer,
  extractPartnershipDiscountInfo,
  type CategorizedLineItems,
  type PartnershipDiscountInfo,
} from './helpers';
export { sendTicketConfirmationEmails } from './ticket-emails';
