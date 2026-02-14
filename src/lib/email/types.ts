/**
 * Email Service Types
 * Shared data structures for all email functions
 */

/**
 * Data structure for ticket confirmation email
 */
export interface TicketConfirmationData {
  to: string;
  customerName: string;
  customerEmail: string;
  ticketType: string;
  orderNumber: string;
  amountPaid: number;
  currency: string;
  conferenceDate: string;
  conferenceName: string;
  badgeLabel?: string;
  notes?: string;
  ticketId?: string; // Optional - if different from orderNumber
  qrCodeUrl?: string; // QR code URL from Supabase object storage (required for emails to work)
  pdfAttachment?: Buffer; // Optional PDF ticket attachment
  orderUrl?: string; // Optional custom order URL (uses secure token if provided)
}

/**
 * Data structure for verification request email
 */
export interface VerificationRequestData {
  to: string;
  name: string;
  verificationId: string;
  verificationType: 'student' | 'unemployed';
  // Student-specific fields
  university?: string;
  studentId?: string;
  // Unemployed-specific fields
  linkedInUrl?: string;
  ravRegistrationDate?: string;
  // Common optional field
  additionalInfo?: string;
}

/**
 * Data structure for voucher confirmation email
 */
export interface VoucherConfirmationData {
  to: string;
  firstName: string;
  amountPaid: number;
  voucherValue: number;
  currency: string;
  bonusPercent?: number;
  orderUrl?: string;
}

/**
 * Data structure for reviewer invitation email
 */
export interface ReviewerInvitationData {
  to: string;
  reviewerName?: string;
  accessLevel: 'full_access' | 'anonymous' | 'readonly';
}

/**
 * Data structure for sponsorship inquiry email
 */
export interface SponsorshipInquiryData {
  name: string;
  company: string;
  email: string;
  message: string;
  inquiryId: string;
}

/**
 * Data structure for issue report email
 */
export interface IssueReportData {
  reportId: string;
  name: string;
  email: string;
  issueType:
    | 'typo'
    | 'broken_link'
    | 'incorrect_info'
    | 'ui_bug'
    | 'mobile_issue'
    | 'accessibility'
    | 'missing_content'
    | 'confusing_ux'
    | 'performance'
    | 'other';
  pageUrl?: string;
  description: string;
  suggestedFix?: string;
  screenshotUrl?: string;
  rewardPreference: 'ticket_discount' | 'workshop_voucher' | 'no_reward';
  userAgent?: string;
  submittedAt: string;
  posthogSessionId?: string;
  posthogDistinctId?: string;
}

/**
 * Data structure for VIP upgrade email
 */
export interface VipUpgradeEmailData {
  to: string;
  firstName: string;
  ticketId: string;
  upgradeMode: 'complimentary' | 'bank_transfer' | 'stripe';
  upgradeStatus: 'pending_payment' | 'pending_bank_transfer' | 'completed' | 'cancelled';
  amount: number | null;
  currency: string | null;
  stripePaymentUrl?: string | null;
  bankTransferReference?: string | null;
  bankTransferDueDate?: string | null;
  manageTicketUrl: string;
}
