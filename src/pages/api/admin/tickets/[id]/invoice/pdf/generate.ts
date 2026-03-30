/**
 * Ticket Invoice PDF Generate API
 * POST /api/admin/tickets/[id]/invoice/pdf/generate
 *
 * Generates a PDF invoice from ticket order data and stores it in Supabase storage.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { resolveOrderContext, createTicketInvoice, updateTicketInvoicePDF } from '@/lib/tickets';
import { generateTicketInvoicePDF } from '@/lib/pdf';
import { createServiceRoleClient } from '@/lib/supabase';
import type { TicketInvoicePDFProps, TicketInvoiceLineItem } from '@/lib/types/ticket-invoice';
import { logger } from '@/lib/logger';

const log = logger.scope('Ticket Invoice PDF Generate');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  try {
    // 1. Resolve order context
    const orderContext = await resolveOrderContext(id);

    if (!orderContext.canGenerateInvoice) {
      return res.status(422).json({ error: orderContext.invoiceWarning });
    }

    // 2. Create invoice record (idempotent — returns existing if already exists)
    const invoice = await createTicketInvoice(orderContext);

    // 3. Refresh stored snapshot with full order data (group purchases may have been
    //    auto-created with only one ticket before other tickets in the session existed).
    const supabase = createServiceRoleClient();
    if (orderContext.allTickets.length > 1 || invoice.ticket_ids.length < orderContext.allTickets.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('ticket_invoices')
        .update({
          ticket_ids: orderContext.allTickets.map((t) => t.id),
          line_items: orderContext.lineItems,
          subtotal_amount: orderContext.subtotalAmount,
          discount_amount: orderContext.discountAmount,
          total_amount: orderContext.totalAmount,
          primary_ticket_id: orderContext.primaryTicket.id,
        })
        .eq('id', invoice.id);
    }

    // 4. Build PDF props — always use fresh orderContext amounts and line items
    const pdfProps: TicketInvoicePDFProps = {
      invoiceNumber: invoice.invoice_number,
      issueDate: new Date().toLocaleDateString('en-CH'),
      paymentReference: orderContext.primaryTicket.stripe_payment_intent_id ?? invoice.stripe_session_id,
      billing: {
        name: invoice.billing_name,
        email: invoice.billing_email,
        company: invoice.billing_company,
        addressLine1: invoice.billing_address_line1,
        addressLine2: invoice.billing_address_line2,
        city: invoice.billing_city,
        state: invoice.billing_state,
        postalCode: invoice.billing_postal_code,
        country: invoice.billing_country,
      },
      lineItems: orderContext.lineItems as TicketInvoiceLineItem[],
      subtotalAmount: orderContext.subtotalAmount,
      discountAmount: orderContext.discountAmount,
      totalAmount: orderContext.totalAmount,
      currency: invoice.currency,
      notes: invoice.notes,
    };

    // 5. Generate PDF buffer
    const pdfBuffer = await generateTicketInvoicePDF(pdfProps);

    // 6. Upload to Supabase storage
    const filePath = `invoices/${invoice.invoice_number}_${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('ticket-invoices')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      log.error('Error uploading PDF to storage', uploadError);
      return res.status(500).json({ error: 'Failed to upload PDF to storage' });
    }

    // 7. Get public URL
    const { data: urlData } = supabase.storage.from('ticket-invoices').getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    // 8. Update invoice record with PDF URL
    await updateTicketInvoicePDF(invoice.id, publicUrl, 'generated');

    // 9. Cleanup old PDF files for this invoice (non-blocking, after DB is updated)
    try {
      const { data: existingFiles } = await supabase.storage
        .from('ticket-invoices')
        .list('invoices', {
          search: invoice.invoice_number,
        });

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles
          .filter((f) => f.name.startsWith(invoice.invoice_number) && `invoices/${f.name}` !== filePath)
          .map((f) => `invoices/${f.name}`);
        if (filesToDelete.length > 0) {
          await supabase.storage.from('ticket-invoices').remove(filesToDelete);
        }
      }
    } catch (cleanupError) {
      log.warn('Failed to cleanup old PDF files', {
        error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
      });
      // Continue anyway — not critical
    }

    return res.status(200).json({
      success: true,
      invoiceNumber: invoice.invoice_number,
      pdfUrl: publicUrl,
      source: 'generated',
    });
  } catch (error) {
    log.error('Error generating ticket invoice PDF', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate PDF',
    });
  }
}
