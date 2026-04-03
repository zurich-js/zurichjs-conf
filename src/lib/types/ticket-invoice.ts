/**
 * Ticket Invoice Types
 * Types for invoice generation on individual and group ticket purchases
 */

import type { Ticket } from './database';

export type TicketInvoicePDFSource = 'generated' | 'uploaded';

/**
 * A single line item on a ticket invoice.
 * Tickets are grouped by category + stage for cleaner invoices.
 */
export interface TicketInvoiceLineItem {
  description: string;    // e.g. "ZurichJS Conference 2026 – Early Bird Standard Ticket"
  quantity: number;
  unitAmount: number;     // cents, per ticket
  totalAmount: number;    // cents, quantity * unitAmount
  ticketCategory: string;
  ticketStage: string;
}

/**
 * Billing details extracted from the purchaser's checkout session.
 */
export interface TicketInvoiceBillingDetails {
  name: string;
  email: string;
  company?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

/**
 * Persisted ticket invoice record from the database.
 */
export interface TicketInvoice {
  id: string;
  invoice_number: string;
  stripe_session_id: string;
  ticket_ids: string[];
  primary_ticket_id: string;
  billing_name: string;
  billing_email: string;
  billing_company: string | null;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
  currency: string;
  subtotal_amount: number;   // cents, before discount
  discount_amount: number;  // cents, total discount applied
  total_amount: number;     // cents, actually paid
  pdf_url: string | null;
  pdf_source: TicketInvoicePDFSource | null;
  line_items: TicketInvoiceLineItem[] | null;
  notes: string | null;
  generated_by: string | null;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Resolved order context from a ticket ID.
 * Used to display purchase summary in admin and to create an invoice.
 */
export interface TicketOrderContext {
  isGroupPurchase: boolean;
  allTickets: Ticket[];           // all tickets in same Stripe session
  primaryTicket: Ticket;          // the purchaser's ticket (isPrimary: true, or first)
  purchaserInfo: TicketInvoiceBillingDetails;
  stripeSessionId: string;
  totalAmount: number;            // cents, sum of amount_paid across all tickets
  discountAmount: number;         // cents, sum of discount_amount across all tickets
  subtotalAmount: number;         // cents, totalAmount + discountAmount
  currency: string;
  ticketCount: number;
  lineItems: TicketInvoiceLineItem[];
  existingInvoice: TicketInvoice | null;
  canGenerateInvoice: boolean;    // false for B2B-sourced tickets
  invoiceWarning?: string;        // shown in UI when canGenerateInvoice is false
}

/**
 * Props for the TicketInvoicePDF React component.
 */
export interface TicketInvoicePDFProps {
  invoiceNumber: string;
  issueDate: string;              // formatted date string
  billing: TicketInvoiceBillingDetails;
  lineItems: TicketInvoiceLineItem[];
  subtotalAmount: number;         // cents
  discountAmount: number;         // cents
  totalAmount: number;            // cents, actually paid
  currency: string;
  paymentReference: string;       // Stripe session ID or bank transfer ref
  notes?: string | null;
}
