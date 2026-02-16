/**
 * Email Service
 * Re-exports all email functions and types
 */

// Types
export type {
  TicketConfirmationData,
  VerificationRequestData,
  VoucherConfirmationData,
  ReviewerInvitationData,
  SponsorshipInquiryData,
  VipUpgradeEmailData,
  CfpFeedbackRequestData,
} from './types';

// Config (for internal use or testing)
export { EMAIL_CONFIG, getResendClient } from './config';

// Ticket emails
export {
  sendTicketConfirmationEmail,
  sendTicketConfirmationEmailsQueued,
} from './ticket-emails';

// Voucher emails
export { sendVoucherConfirmationEmail } from './voucher-emails';

// CFP emails
export { sendReviewerInvitationEmail, sendCfpFeedbackRequestEmail } from './cfp-emails';

// Verification emails
export { sendVerificationRequestEmail } from './verification-emails';

// Sponsorship emails
export { sendSponsorshipInquiryEmails } from './sponsorship-emails';

// VIP emails
export { sendVipUpgradeEmail } from './vip-emails';

// Newsletter
export { addNewsletterContact } from './newsletter';
