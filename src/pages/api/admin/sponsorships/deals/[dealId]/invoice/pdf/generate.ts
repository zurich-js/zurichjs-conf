/**
 * Generate Sponsorship Invoice PDF API
 * POST /api/admin/sponsorships/deals/[dealId]/invoice/pdf/generate
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { getDealWithRelations, updateInvoicePDF } from '@/lib/sponsorship';
import { generateSponsorshipInvoicePDF } from '@/lib/pdf';
import { createServiceRoleClient } from '@/lib/supabase';
import type { SponsorshipInvoicePDFProps } from '@/lib/types/sponsorship';
import { logger } from '@/lib/logger';

const log = logger.scope('Generate Sponsorship Invoice PDF API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { dealId } = req.query;
  if (!dealId || typeof dealId !== 'string') {
    return res.status(400).json({ error: 'Missing deal ID' });
  }

  try {
    // Get deal with all relations
    const deal = await getDealWithRelations(dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Check if invoice exists
    if (!deal.invoice) {
      return res.status(400).json({ error: 'No invoice exists for this deal. Create an invoice first.' });
    }

    const { sponsor, tier, line_items, invoice } = deal;

    // Prepare PDF props
    const pdfProps: SponsorshipInvoicePDFProps = {
      invoiceNumber: invoice.invoice_number,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      companyName: sponsor.company_name,
      vatId: sponsor.vat_id || undefined,
      billingAddress: {
        street: sponsor.billing_address_street,
        city: sponsor.billing_address_city,
        postalCode: sponsor.billing_address_postal_code,
        country: sponsor.billing_address_country,
      },
      contactName: sponsor.contact_name,
      contactEmail: sponsor.contact_email,
      tierName: tier.name,
      lineItems: line_items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.unit_price * item.quantity,
        type: item.type,
        usesCredit: item.uses_credit,
      })),
      subtotal: invoice.subtotal,
      creditApplied: invoice.credit_applied,
      adjustmentsTotal: invoice.adjustments_total,
      total: invoice.total_amount,
      currency: invoice.currency as 'CHF' | 'EUR',
      invoiceNotes: invoice.invoice_notes || undefined,
    };

    // Generate PDF
    const pdfBuffer = await generateSponsorshipInvoicePDF(pdfProps);

    // Upload to storage
    const supabase = createServiceRoleClient();
    const timestamp = Date.now();
    const filename = `${invoice.invoice_number}_${timestamp}.pdf`;
    const filePath = `invoices/${filename}`;

    // Delete old PDF files for this invoice
    const { data: existingFiles } = await supabase.storage
      .from('sponsorship-assets')
      .list('invoices', { search: invoice.invoice_number });

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `invoices/${f.name}`);
      try {
        await supabase.storage.from('sponsorship-assets').remove(filesToDelete);
      } catch (cleanupError) {
        log.warn('Failed to cleanup old PDF files', { error: cleanupError });
        // Continue anyway - not critical
      }
    }

    // Upload new PDF
    const { error: uploadError } = await supabase.storage
      .from('sponsorship-assets')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('sponsorship-assets')
      .getPublicUrl(filePath);

    // Update invoice record
    await updateInvoicePDF(invoice.id, publicUrl, 'generated');

    log.info('Sponsorship invoice PDF generated', {
      dealId,
      invoiceNumber: invoice.invoice_number,
      pdfUrl: publicUrl,
    });

    return res.status(200).json({
      success: true,
      pdfUrl: publicUrl,
      source: 'generated',
    });
  } catch (error) {
    log.error('Error generating sponsorship invoice PDF', { error, dealId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate PDF',
    });
  }
}
