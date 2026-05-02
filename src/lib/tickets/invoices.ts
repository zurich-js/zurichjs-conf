/**
 * Ticket Invoice Business Logic
 * Functions for extracting purchaser info, building line items, and managing invoice records.
 */

import type { Ticket } from '@/lib/types/database';
import type {
  TicketInvoice,
  TicketInvoiceBillingDetails,
  TicketInvoiceLineItem,
  TicketOrderContext,
} from '@/lib/types/ticket-invoice';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * The ticket_invoices table is not yet in the generated Supabase types because the
 * migration has not been applied to the type-generation environment. We obtain an
 * untyped query builder by casting through `unknown` so that all other type checks
 * in this file remain strict.
 */
type AnyClient = any;

const log = logger.scope('TicketInvoices');

// ─── Label maps ─────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  standard: 'Standard',
  student: 'Student',
  unemployed: 'Job Seeker',
  vip: 'VIP',
};

const STAGE_LABELS: Record<string, string> = {
  blind_bird: 'Blind Bird',
  early_bird: 'Early Bird',
  general_admission: 'General Admission',
  late_bird: 'Late Bird',
};

// ─── Helper: safely read session_metadata ────────────────────────────────────

interface SessionMetadata {
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

function getSessionMetadata(ticket: Ticket): SessionMetadata {
  const raw = ticket.metadata?.session_metadata;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as SessionMetadata;
  }
  return {};
}

// ─── extractPurchaserInfo ────────────────────────────────────────────────────

/**
 * Extract billing details from the primary ticket using the documented priority order.
 *
 * Name priority:   session_metadata firstName+lastName → metadata.purchaserName → ticket first_name+last_name
 * Email priority:  session_metadata.email → metadata.billingEmail → ticket.email
 * Company:         ticket.company || session_metadata.company
 * Address:         session_metadata fields
 */
export function extractPurchaserInfo(primaryTicket: Ticket): TicketInvoiceBillingDetails {
  const sm = getSessionMetadata(primaryTicket);

  // Name
  let name: string;
  const smFullName = [sm.firstName, sm.lastName].filter(Boolean).join(' ').trim();
  if (smFullName) {
    name = smFullName;
  } else if (typeof primaryTicket.metadata?.purchaserName === 'string' && primaryTicket.metadata.purchaserName) {
    name = primaryTicket.metadata.purchaserName;
  } else {
    name = `${primaryTicket.first_name} ${primaryTicket.last_name}`.trim();
  }

  // Email
  let email: string;
  if (sm.email) {
    email = sm.email;
  } else if (typeof primaryTicket.metadata?.billingEmail === 'string' && primaryTicket.metadata.billingEmail) {
    email = primaryTicket.metadata.billingEmail;
  } else {
    email = primaryTicket.email;
  }

  // Company
  const company = primaryTicket.company ?? sm.company ?? null;

  return {
    name,
    email,
    company,
    addressLine1: sm.addressLine1 ?? null,
    addressLine2: sm.addressLine2 ?? null,
    city: sm.city ?? null,
    state: sm.state ?? null,
    postalCode: sm.postalCode ?? null,
    country: sm.country ?? null,
  };
}

// ─── buildLineItems ──────────────────────────────────────────────────────────

/**
 * Group tickets by category:stage and produce clean invoice line items.
 */
export function buildLineItems(tickets: Ticket[]): TicketInvoiceLineItem[] {
  const groups = new Map<string, Ticket[]>();

  for (const ticket of tickets) {
    const key = `${ticket.ticket_category}:${ticket.ticket_stage}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(ticket);
    } else {
      groups.set(key, [ticket]);
    }
  }

  const lineItems: TicketInvoiceLineItem[] = [];

  for (const [key, group] of groups) {
    const [category, stage] = key.split(':');
    const categoryLabel = CATEGORY_LABELS[category] ?? category;
    const stageLabel = STAGE_LABELS[stage] ?? stage;
    const description = `ZurichJS Conference 2026 – ${categoryLabel} Ticket (${stageLabel})`;
    const quantity = group.length;
    const totalAmount = group.reduce((sum, t) => sum + t.amount_paid, 0);
    const unitAmount = Math.round(totalAmount / quantity);

    lineItems.push({
      description,
      quantity,
      unitAmount,
      totalAmount,
      ticketCategory: category,
      ticketStage: stage,
    });
  }

  return lineItems;
}

// ─── getTicketInvoice ────────────────────────────────────────────────────────

/**
 * Fetch a ticket invoice by its ID.
 */
export async function getTicketInvoice(invoiceId: string): Promise<TicketInvoice | null> {
  const supabase = createServiceRoleClient() as AnyClient;

  const { data, error } = await supabase
    .from('ticket_invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    log.error('Failed to fetch ticket invoice by ID', error, { invoiceId });
    return null;
  }

  return data as TicketInvoice;
}

// ─── getInvoiceBySessionId ───────────────────────────────────────────────────

/**
 * Fetch a ticket invoice by Stripe session ID. Returns null if not found or on error.
 */
export async function getInvoiceBySessionId(sessionId: string): Promise<TicketInvoice | null> {
  const supabase = createServiceRoleClient() as AnyClient;

  const { data, error } = await supabase
    .from('ticket_invoices')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    log.error('Failed to fetch ticket invoice by session ID', error, { sessionId });
    return null;
  }

  return data as TicketInvoice;
}

// ─── resolveOrderContext ─────────────────────────────────────────────────────

/**
 * Resolve the full order context for a ticket ID.
 * Used to display purchase summary in admin and to create an invoice.
 */
export async function resolveOrderContext(ticketId: string): Promise<TicketOrderContext> {
  const supabase = createServiceRoleClient();

  // 1. Fetch the ticket by ID
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .single();

  if (ticketError || !ticket) {
    log.error('Failed to fetch ticket for order context', ticketError, { ticketId });
    throw new Error(`Ticket not found: ${ticketId}`);
  }

  const stripeSessionId: string = (ticket as Ticket).stripe_session_id;

  // 2. B2B invoice check
  if (stripeSessionId.startsWith('b2b_invoice_')) {
    const primaryTicket = ticket as Ticket;
    return {
      isGroupPurchase: false,
      allTickets: [primaryTicket],
      primaryTicket,
      purchaserInfo: extractPurchaserInfo(primaryTicket),
      stripeSessionId,
      totalAmount: primaryTicket.amount_paid,
      discountAmount: primaryTicket.discount_amount ?? 0,
      subtotalAmount: primaryTicket.amount_paid + (primaryTicket.discount_amount ?? 0),
      currency: primaryTicket.currency,
      ticketCount: 1,
      lineItems: buildLineItems([primaryTicket]),
      existingInvoice: null,
      canGenerateInvoice: false,
      invoiceWarning:
        'This ticket was issued via a B2B invoice. Use the B2B Orders system to manage its invoice.',
    };
  }

  // 3. Fetch all tickets with the same stripe_session_id
  const { data: allTicketsRaw, error: sessError } = await supabase
    .from('tickets')
    .select('*')
    .eq('stripe_session_id', stripeSessionId)
    .order('created_at', { ascending: true });

  if (sessError || !allTicketsRaw) {
    log.error('Failed to fetch tickets for session', sessError, { stripeSessionId });
    throw new Error(`Failed to fetch tickets for session: ${stripeSessionId}`);
  }

  const sessionTickets = allTicketsRaw as Ticket[];
  const allTickets = (sessionTickets ?? [ticket]) as Ticket[];

  if (allTickets.length === 0) {
    throw new Error(`No tickets found for session: ${stripeSessionId}`);
  }

  // 4. Determine primary ticket
  const primaryTicket: Ticket =
    allTickets.find((t) => t.metadata?.isPrimary === true) ?? allTickets[0];

  // 5. Build aggregates
  const totalAmount = allTickets.reduce((sum, t) => sum + t.amount_paid, 0);
  const discountAmount = allTickets.reduce((sum, t) => sum + (t.discount_amount ?? 0), 0);
  const subtotalAmount = totalAmount + discountAmount;
  const currency = primaryTicket.currency;

  // 6. Check for existing invoice
  const existingInvoice = await getInvoiceBySessionId(stripeSessionId);

  return {
    isGroupPurchase: allTickets.length > 1,
    allTickets,
    primaryTicket,
    purchaserInfo: extractPurchaserInfo(primaryTicket),
    stripeSessionId,
    totalAmount,
    discountAmount,
    subtotalAmount,
    currency,
    ticketCount: allTickets.length,
    lineItems: buildLineItems(allTickets),
    existingInvoice,
    canGenerateInvoice: true,
  };
}

// ─── createTicketInvoice ─────────────────────────────────────────────────────

/**
 * Create a ticket invoice record in the database.
 * Idempotent: returns existing invoice if one already exists for the session.
 */
export async function createTicketInvoice(
  context: TicketOrderContext,
  generatedBy?: string
): Promise<TicketInvoice> {
  // Idempotency check
  const existing = await getInvoiceBySessionId(context.stripeSessionId);
  if (existing) {
    log.info('Returning existing invoice (idempotent)', {
      stripeSessionId: context.stripeSessionId,
      invoiceId: existing.id,
    });
    return existing;
  }

  const supabase = createServiceRoleClient() as AnyClient;

  const { purchaserInfo: billing, primaryTicket } = context;

  const insertPayload = {
    invoice_number: '', // DB trigger generates the invoice number
    stripe_session_id: context.stripeSessionId,
    ticket_ids: context.allTickets.map((t) => t.id),
    primary_ticket_id: primaryTicket.id,
    billing_name: billing.name,
    billing_email: billing.email,
    billing_company: billing.company ?? null,
    billing_address_line1: billing.addressLine1 ?? null,
    billing_address_line2: billing.addressLine2 ?? null,
    billing_city: billing.city ?? null,
    billing_state: billing.state ?? null,
    billing_postal_code: billing.postalCode ?? null,
    billing_country: billing.country ?? null,
    currency: context.currency,
    subtotal_amount: context.subtotalAmount,
    discount_amount: context.discountAmount,
    total_amount: context.totalAmount,
    pdf_url: null,
    pdf_source: null,
    line_items: context.lineItems,
    notes: null,
    generated_by: generatedBy ?? null,
  };

  const { data, error } = await supabase
    .from('ticket_invoices')
    .insert(insertPayload)
    .select('*')
    .single();

  // Handle race condition: another request inserted between our check and insert
  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation — fetch the winner
      const raceWinner = await getInvoiceBySessionId(context.stripeSessionId);
      if (raceWinner) return raceWinner;
    }
    log.error('Failed to create ticket invoice', error, {
      stripeSessionId: context.stripeSessionId,
    });
    throw new Error(`Failed to create ticket invoice: ${error.message}`);
  }

  if (!data) {
    log.error('Failed to create ticket invoice', null, {
      stripeSessionId: context.stripeSessionId,
    });
    throw new Error('Failed to create ticket invoice: unknown error');
  }

  log.info('Created ticket invoice', {
    invoiceId: (data as TicketInvoice).id,
    stripeSessionId: context.stripeSessionId,
  });

  return data as TicketInvoice;
}

// ─── createInvoiceForNewTicket ───────────────────────────────────────────────

/**
 * Auto-create an invoice record immediately when a ticket is created.
 * Called from createTicket after a successful insert — non-fatal if it fails.
 *
 * Only runs for the primary ticket in an order (skips explicitly non-primary
 * tickets in group purchases; the primary ticket's insert will win via idempotency).
 * Skips non-Stripe sessions (B2B, manual, bank transfer, complimentary).
 */
export async function createInvoiceForNewTicket(ticket: Ticket): Promise<void> {
  const { stripe_session_id: sessionId } = ticket;

  // Skip non-Stripe sessions
  if (
    sessionId.startsWith('b2b_invoice_') ||
    sessionId.startsWith('manual_') ||
    sessionId.startsWith('bank_transfer_') ||
    sessionId.startsWith('complimentary_')
  ) {
    return;
  }

  // For group purchases, only the primary ticket creates the invoice.
  // Non-primary tickets would insert with the same stripe_session_id and hit the
  // unique constraint — silently ignored via 23505 handling below.
  const isPrimary = ticket.metadata?.isPrimary;
  if (isPrimary === false) return;

  const purchaserInfo = extractPurchaserInfo(ticket);
  const lineItems = buildLineItems([ticket]);
  const discountAmount = ticket.discount_amount ?? 0;
  const totalAmount = ticket.amount_paid;
  const subtotalAmount = totalAmount + discountAmount;

  const supabase = createServiceRoleClient() as AnyClient;

  const { error } = await supabase.from('ticket_invoices').insert({
    invoice_number: '', // DB trigger generates TI-YYYY-NNNN
    stripe_session_id: sessionId,
    ticket_ids: [ticket.id],
    primary_ticket_id: ticket.id,
    billing_name: purchaserInfo.name,
    billing_email: purchaserInfo.email,
    billing_company: purchaserInfo.company ?? null,
    billing_address_line1: purchaserInfo.addressLine1 ?? null,
    billing_address_line2: purchaserInfo.addressLine2 ?? null,
    billing_city: purchaserInfo.city ?? null,
    billing_state: purchaserInfo.state ?? null,
    billing_postal_code: purchaserInfo.postalCode ?? null,
    billing_country: purchaserInfo.country ?? null,
    currency: ticket.currency,
    subtotal_amount: subtotalAmount,
    discount_amount: discountAmount,
    total_amount: totalAmount,
    line_items: lineItems,
    generated_by: 'webhook',
  });

  if (error) {
    if (error.code === '23505') {
      // Another ticket in the same session already created the invoice — fine.
      log.info('Invoice already exists for session (idempotent)', { sessionId });
      return;
    }
    // Log but do not throw — ticket creation must not fail due to invoice errors.
    log.error('Failed to auto-create invoice for ticket', error, { ticketId: ticket.id, sessionId });
  } else {
    log.info('Auto-created invoice for ticket', { ticketId: ticket.id, sessionId });
  }
}

// ─── deleteTicketInvoice ─────────────────────────────────────────────────────

/**
 * Delete a ticket invoice: removes the PDF from storage then deletes the DB record.
 */
export async function deleteTicketInvoice(invoiceId: string): Promise<void> {
  const supabase = createServiceRoleClient() as AnyClient;

  // Fetch the invoice to get the PDF URL
  const invoice = await getTicketInvoice(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  // Delete PDF from storage if present
  if (invoice.pdf_url) {
    try {
      const bucket = 'ticket-invoices';
      const separator = `/public/${bucket}/`;
      const idx = invoice.pdf_url.indexOf(separator);
      if (idx !== -1) {
        const filePath = invoice.pdf_url.slice(idx + separator.length);
        const { error: storageError } = await supabase.storage.from(bucket).remove([filePath]);
        if (storageError) {
          log.warn('Failed to delete PDF from storage (continuing)', { invoiceId, error: storageError.message });
        }
      }
    } catch (storageErr) {
      log.warn('Unexpected error deleting PDF from storage (continuing)', { invoiceId, error: storageErr });
    }
  }

  // Delete DB record
  const { error } = await supabase.from('ticket_invoices').delete().eq('id', invoiceId);
  if (error) {
    log.error('Failed to delete ticket invoice DB record', error, { invoiceId });
    throw new Error(`Failed to delete ticket invoice: ${error.message}`);
  }

  log.info('Deleted ticket invoice', { invoiceId });
}

// ─── updateTicketInvoicePDF ──────────────────────────────────────────────────

/**
 * Update the PDF URL and source on an existing ticket invoice.
 */
export async function updateTicketInvoicePDF(
  invoiceId: string,
  url: string,
  source: 'generated' | 'uploaded'
): Promise<void> {
  const supabase = createServiceRoleClient() as AnyClient;

  const { error } = await supabase
    .from('ticket_invoices')
    .update({ pdf_url: url, pdf_source: source })
    .eq('id', invoiceId);

  if (error) {
    log.error('Failed to update ticket invoice PDF', error, { invoiceId, url, source });
    throw new Error(`Failed to update ticket invoice PDF: ${error.message}`);
  }

  log.info('Updated ticket invoice PDF', { invoiceId, url, source });
}
