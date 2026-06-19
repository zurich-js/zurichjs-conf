/**
 * Email Service
 * Re-exports all email functions and types
 */

// Types
export type {
  TicketConfirmationData,
  VerificationRequestData,
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

// Workshop emails
export { sendWorkshopConfirmationEmail } from './workshop-emails';
export type { WorkshopConfirmationData } from './workshop-emails';

// CFP emails
export { sendReviewerInvitationEmail, sendCfpFeedbackRequestEmail } from './cfp-emails';

// Verification emails
export { sendVerificationRequestEmail } from './verification-emails';

// Sponsorship emails
export { sendSponsorshipInquiryEmails } from './sponsorship-emails';

// VIP emails
export { sendVipUpgradeEmail } from './vip-emails';

// Verification approval emails
export { sendVerificationApprovalEmail } from './verification-approval-emails';

// Newsletter
export { addNewsletterContact } from './newsletter';

// Student ticket waitlist
export { addStudentWaitlistContact } from './student-waitlist';

// Volunteer emails
export { sendVolunteerApplicationConfirmationEmail } from './volunteer-emails';
