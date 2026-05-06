/**
 * Checkout Processing Modules
 * Barrel export for checkout-related functionality
 */

export { processTickets } from './tickets';
export type { AttendeeInfo, TicketCreationResult } from './tickets';
export { processWorkshops } from './workshops';
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
