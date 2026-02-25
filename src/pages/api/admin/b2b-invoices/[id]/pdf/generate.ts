/**
 * Generate B2B Invoice PDF API
 * POST /api/admin/b2b-invoices/[id]/pdf/generate
 *
 * Generates a PDF invoice from invoice data and stores it in Supabase storage.
 * Bank details are hardcoded in the PDF template (PostFinance).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getInvoice, updateInvoicePDF } from '@/lib/b2b';
import { generateInvoicePDF } from '@/lib/pdf';
import { createServiceRoleClient } from '@/lib/supabase';
import type { InvoicePDFProps } from '@/lib/types/b2b';
import { logger } from '@/lib/logger';

const log = logger.scope('B2B Invoice PDF Generate');

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
    return res.status(400).json({ error: 'Invalid invoice ID' });
  }

  try {
    // Get invoice data
    const invoice = await getInvoice(id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Map ticket category/stage to description
    const categoryLabels: Record<string, string> = {
      standard: 'Standard',
      student: 'Student',
      unemployed: 'Job Seeker',
      vip: 'VIP',
    };
    const stageLabels: Record<string, string> = {
      blind_bird: 'Blind Bird',
      early_bird: 'Early Bird',
      general_admission: 'General Admission',
      late_bird: 'Late Bird',
    };

    const ticketDescription = `ZurichJS Conference 2026 - ${categoryLabels[invoice.ticket_category] || invoice.ticket_category} Ticket (${stageLabels[invoice.ticket_stage] || invoice.ticket_stage})`;

    // Build PDF props
    // Bank details are hardcoded in the PDF template (PostFinance)
    const pdfProps: InvoicePDFProps = {
      invoiceNumber: invoice.invoice_number,
      issueDate: new Date(invoice.issue_date).toLocaleDateString('en-CH'),
      dueDate: new Date(invoice.due_date).toLocaleDateString('en-CH'),
      companyName: invoice.company_name,
      vatId: invoice.vat_id || undefined,
      billingAddress: {
        street: invoice.billing_address_street,
        city: invoice.billing_address_city,
        postalCode: invoice.billing_address_postal_code,
        country: invoice.billing_address_country,
      },
      contactName: invoice.contact_name,
      contactEmail: invoice.contact_email,
      lineItems: [
        {
          description: ticketDescription,
          quantity: invoice.ticket_quantity,
          unitPrice: invoice.unit_price,
          total: invoice.subtotal,
        },
      ],
      subtotal: invoice.subtotal,
      vatRate: invoice.vat_rate,
      vatAmount: invoice.vat_amount,
      total: invoice.total_amount,
      currency: invoice.currency,
      invoiceNotes: invoice.invoice_notes || undefined,
    };

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(pdfProps);

    // Upload to Supabase storage
    const supabase = createServiceRoleClient();
    // Add timestamp to filename to bust browser cache on regeneration
    const timestamp = Date.now();
    const filename = `${invoice.invoice_number}_${timestamp}.pdf`;
    const filePath = `invoices/${filename}`;

    // Delete old PDF files for this invoice (cleanup)
    try {
      const { data: existingFiles } = await supabase.storage
        .from('b2b-invoices')
        .list('invoices', {
          search: invoice.invoice_number,
        });

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles
          .filter(f => f.name.startsWith(invoice.invoice_number))
          .map(f => `invoices/${f.name}`);
        if (filesToDelete.length > 0) {
          await supabase.storage.from('b2b-invoices').remove(filesToDelete);
        }
      }
    } catch (cleanupError) {
      log.warn('Failed to cleanup old PDF files', { error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error' });
      // Continue anyway - not critical
    }

    const { error: uploadError } = await supabase.storage
      .from('b2b-invoices')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false, // New filename each time
      });

    if (uploadError) {
      log.error('Error uploading PDF', uploadError);
      return res.status(500).json({ error: 'Failed to upload PDF to storage' });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('b2b-invoices')
      .getPublicUrl(filePath);

    // Update invoice with PDF URL
    await updateInvoicePDF(id, urlData.publicUrl, 'generated');

    return res.status(200).json({
      success: true,
      pdfUrl: urlData.publicUrl,
      source: 'generated',
    });
  } catch (error) {
    log.error('Error generating invoice PDF', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate PDF',
    });
  }
}
