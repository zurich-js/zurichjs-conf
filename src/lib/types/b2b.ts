/**
 * B2B Invoice Types
 * TypeScript types for B2B ticket sales and invoicing system
 */

import type { TicketCategory, TicketStage } from './database';

/**
 * B2B Invoice Status - Lifecycle stages of an invoice
 * - draft: Invoice created but not sent to customer
 * - sent: Invoice sent to customer, awaiting payment
 * - paid: Payment received, tickets created
 * - cancelled: Invoice cancelled (no payment expected)
 */
export type B2BInvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

/**
 * Invoice PDF source - How the PDF was attached
 */
export type InvoicePDFSource = 'generated' | 'uploaded';

/**
 * Payment method for B2B invoices
 * - bank_transfer: Traditional bank transfer (shows bank details on invoice)
 * - stripe: Stripe payment link
 */
export type B2BPaymentMethod = 'bank_transfer' | 'stripe';

/**
 * Billing address structure
 */
export interface BillingAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

/**
 * B2B Invoice - Full invoice record from database
 */
export interface B2BInvoice {
  id: string;
  invoice_number: string;

  // Company Billing Information
  company_name: string;
  vat_id: string | null;
  billing_address_street: string;
  billing_address_city: string;
  billing_address_postal_code: string;
  billing_address_country: string;

  // Contact Person
  contact_name: string;
  contact_email: string;

  // Invoice Details
  status: B2BInvoiceStatus;
  issue_date: string;
  due_date: string;
  notes: string | null; // Internal notes (not shown on invoice)
  invoice_notes: string | null; // Notes shown on the invoice PDF

  // Ticket Configuration
  ticket_category: TicketCategory;
  ticket_stage: TicketStage;
  ticket_quantity: number;
  unit_price: number; // in cents
  currency: string;

  // Calculated Totals (all in cents)
  subtotal: number;
  vat_rate: number; // percentage, e.g., 8.1
  vat_amount: number;
  total_amount: number;

  // Payment Tracking
  payment_method: B2BPaymentMethod;
  bank_transfer_reference: string | null;
  stripe_payment_link_id: string | null;
  stripe_payment_link_url: string | null;
  paid_at: string | null;
  paid_by: string | null;

  // Invoice PDF
  invoice_pdf_url: string | null;
  invoice_pdf_source: InvoicePDFSource | null;
  invoice_pdf_uploaded_at: string | null;

  // Metadata
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * B2B Invoice Attendee - Attendee linked to an invoice
 * Ticket is created when invoice is marked as paid
 */
export interface B2BInvoiceAttendee {
  id: string;
  invoice_id: string;

  // Attendee Details
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  job_title: string | null;

  // Link to ticket (populated when invoice is paid)
  ticket_id: string | null;

  // Email Status
  email_sent: boolean;
  email_sent_at: string | null;

  created_at: string;
  updated_at: string;
}

/**
 * Invoice with attendees - Combined view for API responses
 */
export interface B2BInvoiceWithAttendees extends B2BInvoice {
  attendees: B2BInvoiceAttendee[];
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to create a new B2B invoice
 */
export interface CreateB2BInvoiceRequest {
  // Company Details
  companyName: string;
  vatId?: string;
  billingAddress: BillingAddress;

  // Contact Person
  contactName: string;
  contactEmail: string;

  // Invoice Settings
  dueDate: string; // ISO date string (YYYY-MM-DD)
  notes?: string; // Internal notes (not shown on invoice)
  invoiceNotes?: string; // Notes shown on the invoice PDF
  paymentMethod?: B2BPaymentMethod; // Defaults to 'bank_transfer'

  // Ticket Configuration
  ticketCategory: TicketCategory;
  ticketStage: TicketStage;
  ticketQuantity: number;
  unitPrice: number; // in cents

  // VAT (optional, defaults to 0 for B2B)
  vatRate?: number; // percentage

  // Initial attendees (optional - can be added later)
  attendees?: AttendeeInput[];
}

/**
 * Request to update an existing invoice
 * Only allowed for draft/sent status
 */
export interface UpdateB2BInvoiceRequest {
  companyName?: string;
  vatId?: string;
  billingAddress?: Partial<BillingAddress>;
  contactName?: string;
  contactEmail?: string;
  dueDate?: string;
  notes?: string; // Internal notes (not shown on invoice)
  invoiceNotes?: string; // Notes shown on the invoice PDF
  paymentMethod?: B2BPaymentMethod;
  ticketCategory?: TicketCategory;
  ticketStage?: TicketStage;
  ticketQuantity?: number;
  unitPrice?: number;
  vatRate?: number;
}

/**
 * Input for adding an attendee
 */
export interface AttendeeInput {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  jobTitle?: string;
}

/**
 * Request to add attendees to an invoice
 */
export interface AddAttendeesRequest {
  attendees: AttendeeInput[];
}

/**
 * Request to update an attendee
 */
export interface UpdateAttendeeRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  jobTitle?: string;
}

/**
 * Request to mark invoice as paid and create tickets
 * Requires explicit confirmation to prevent accidental bulk operations
 */
export interface MarkPaidRequest {
  /** Bank transfer reference for audit trail */
  bankTransferReference: string;

  /** Whether to send confirmation emails to all attendees */
  sendConfirmationEmails: boolean;

  /** Explicit confirmation that tickets will be created - must be true */
  confirmTicketCreation: boolean;
}

/**
 * Result of marking invoice as paid
 */
export interface MarkPaidResult {
  success: boolean;
  invoiceId: string;
  invoiceNumber: string;
  ticketsCreated: number;
  emailsSent: number;
  emailsFailed: number;
  tickets: Array<{
    attendeeId: string;
    attendeeName: string;
    attendeeEmail: string;
    ticketId: string;
  }>;
  /** Details of any email failures */
  emailFailures?: Array<{
    attendeeEmail: string;
    attendeeName: string;
    reason: string;
  }>;
}

/**
 * Response for listing invoices
 */
export interface ListInvoicesResponse {
  invoices: B2BInvoice[];
  total: number;
}

/**
 * Query parameters for listing invoices
 */
export interface ListInvoicesQuery {
  status?: B2BInvoiceStatus;
  search?: string; // Search by company name or invoice number
  page?: number;
  limit?: number;
}

// ============================================================================
// PDF Types
// ============================================================================

/**
 * Props for generating invoice PDF
 * Note: Bank details are hardcoded in the PDF template (PostFinance)
 */
export interface InvoicePDFProps {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;

  // Company
  companyName: string;
  vatId?: string;
  billingAddress: BillingAddress;

  // Contact
  contactName: string;
  contactEmail: string;

  // Line Items
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;

  // Totals (all in cents)
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;

  /** Notes displayed on the invoice PDF */
  invoiceNotes?: string;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Valid invoice status transitions
 * Maps current status to allowed next statuses
 */
export const VALID_STATUS_TRANSITIONS: Record<B2BInvoiceStatus, B2BInvoiceStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['paid', 'cancelled'],
  paid: [], // Final state - no transitions allowed
  cancelled: [], // Final state - no transitions allowed
};

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  currentStatus: B2BInvoiceStatus,
  newStatus: B2BInvoiceStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}
