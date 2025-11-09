/**
 * Email System Exports
 * Central export file for all email templates, components, and utilities
 */

// Design Tokens
export * from './design/tokens';

// Components
export {
  EmailLayout,
  TicketCard,
  InfoBlock,
  BadgePill,
  WalletButton,
} from './components';

export type {
  EmailLayoutProps,
  TicketCardProps,
  InfoBlockProps,
  BadgePillProps,
  WalletButtonProps,
} from './components';

// Templates
export { TicketPurchaseEmail } from './templates/TicketPurchaseEmail';
export type { TicketPurchaseEmailProps } from './templates/TicketPurchaseEmail';

// Utilities
export {
  renderEmail,
  renderEmailText,
  generateTicketId,
  formatCurrency,
  formatDate,
  formatTime,
  getTimezoneAbbr,
  getFirstName,
  generateAppleWalletUrl,
  generateGoogleWalletUrl,
  generateCalendarUrl,
  generateMapsUrl,
  isValidEmail,
} from './utils/render';

// Example Data (for development and testing)
export {
  sampleTicketData,
  sampleVIPTicketData,
  sampleStudentTicketData,
} from './examples/ticket-purchase.example';
