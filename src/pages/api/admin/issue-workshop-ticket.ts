/**
 * Admin Manual Workshop Seat Issuance API
 * POST /api/admin/issue-workshop-ticket - Manually issue a workshop seat
 *
 * Mirrors /api/admin/issue-ticket for conference tickets: supports
 * complimentary, Stripe-linked, and bank transfer payments, then plugs into
 * the same registration + confirmation email flow as a normal cart checkout.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { createWorkshopRegistration } from '@/lib/workshops';
import { sendWorkshopConfirmationEmail } from '@/lib/email';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import { generateWorkshopPDF, imageUrlToDataUrl } from '@/lib/pdf';
import { generateTicketQRCode } from '@/lib/qrcode';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Issue Workshop Ticket');

const bodySchema = z.object({
  workshopId: z.string().uuid(),

  // Attendee details
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),

  // Payment
  paymentType: z.enum(['complimentary', 'stripe', 'bank_transfer']),
  stripePaymentId: z.string().optional(),
  amountPaid: z.number().int().min(0).optional(), // minor units (cents)
  currency: z.string().toUpperCase().pipe(z.enum(['CHF', 'EUR', 'GBP', 'USD'])).default('CHF'),
  bankTransferReference: z.string().optional(),
  complimentaryReason: z.string().optional(),

  // Options
  sendEmail: z.boolean(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = bodySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', issues: result.error.issues });
    }
    const body = result.data;

    if (body.paymentType === 'stripe') {
      if (!body.stripePaymentId) {
        return res.status(400).json({ error: 'Stripe payment ID is required for Stripe payments' });
      }
      if (body.amountPaid === undefined) {
        return res.status(400).json({ error: 'Valid amount is required for Stripe payments' });
      }
    }

    if (body.paymentType === 'bank_transfer' && body.amountPaid === undefined) {
      return res.status(400).json({ error: 'Valid amount is required for bank transfer payments' });
    }

    const isComplimentary = body.paymentType === 'complimentary';
    const isBankTransfer = body.paymentType === 'bank_transfer';

    const supabase = createServiceRoleClient();
    const { data: workshop, error: workshopError } = await supabase
      .from('workshops')
      .select('*')
      .eq('id', body.workshopId)
      .single();

    if (workshopError || !workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }

    // Synthetic session id — the registration's idempotency key. Same pattern
    // as manual conference tickets (issue-ticket.ts).
    const manualSessionId = `manual_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const registrationResult = await createWorkshopRegistration({
      workshopId: workshop.id,
      stripeSessionId: manualSessionId,
      stripePaymentIntentId: body.paymentType === 'stripe' ? body.stripePaymentId : undefined,
      amountPaid: isComplimentary ? 0 : (body.amountPaid ?? 0),
      currency: body.currency,
      status: 'confirmed',
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      company: body.company || null,
      jobTitle: body.jobTitle || null,
      seatIndex: 0,
      metadata: {
        issued_manually: true,
        issued_at: new Date().toISOString(),
        payment_type: body.paymentType,
        complimentary_reason: isComplimentary ? body.complimentaryReason : undefined,
        stripe_payment_id: body.paymentType === 'stripe' ? body.stripePaymentId : undefined,
        bank_transfer_reference: isBankTransfer ? body.bankTransferReference : undefined,
        total_seats: 1,
        is_primary: true,
      },
    });

    if (registrationResult.oversold) {
      return res.status(409).json({
        error: 'Workshop is at full capacity. Increase the workshop capacity before issuing this seat.',
      });
    }

    const registration = registrationResult.registration;
    if (!registration) {
      log.error('Failed to create workshop registration', {
        error: registrationResult.error,
        workshopId: body.workshopId,
      });
      return res.status(500).json({ error: registrationResult.error || 'Failed to create registration' });
    }

    if (!registrationResult.success) {
      // Row was inserted but a post-insert step (e.g. QR generation) failed.
      // The seat exists, so continue and let the admin resend the email later.
      log.warn('Workshop registration created with post-insert warnings', {
        registrationId: registration.id,
        error: registrationResult.error,
      });
    }

    let emailSent = false;
    if (body.sendEmail) {
      try {
        // Resolve instructor name + public workshop page slug, matching the
        // cart checkout email flow.
        let instructorName: string | null = null;
        let workshopSlug: string | null = null;
        const { speakers } = await fetchPublicSpeakers();
        for (const speaker of speakers) {
          const match = speaker.sessions.find(
            (s) =>
              s.type === 'workshop' &&
              ((workshop.session_id && s.id === workshop.session_id) ||
                (workshop.cfp_submission_id &&
                  (s.cfp_submission_id === workshop.cfp_submission_id || s.id === workshop.cfp_submission_id)))
          );
          if (match) {
            instructorName = [speaker.first_name, speaker.last_name].filter(Boolean).join(' ');
            workshopSlug = match.slug;
            break;
          }
        }

        let pdfAttachment: Buffer | undefined;
        const qrCodeUrl = registration.qr_code_url;
        if (qrCodeUrl) {
          try {
            const qrDataUrl = qrCodeUrl.startsWith('data:')
              ? qrCodeUrl
              : await imageUrlToDataUrl(qrCodeUrl).catch(() => generateTicketQRCode(registration.id));

            pdfAttachment = await generateWorkshopPDF({
              registrationId: registration.id,
              attendeeName: `${body.firstName} ${body.lastName}`.trim(),
              attendeeEmail: body.email,
              workshopTitle: workshop.title,
              instructorName,
              workshopDate: workshop.date ?? 'September 10, 2026',
              amountPaid: registration.amount_paid,
              currency: registration.currency,
              qrCodeDataUrl: qrDataUrl,
            });
          } catch (pdfError) {
            log.error('Error generating workshop PDF', pdfError, { registrationId: registration.id });
            // Continue without PDF
          }
        }

        const emailResult = await sendWorkshopConfirmationEmail({
          to: body.email,
          firstName: body.firstName,
          workshopTitle: workshop.title,
          workshopDescription: workshop.description,
          instructorName,
          date: workshop.date,
          amountPaid: registration.amount_paid,
          currency: registration.currency,
          seatIndex: 0,
          totalSeats: 1,
          workshopSlug,
          qrCodeUrl,
          pdfAttachment,
        });

        emailSent = emailResult.success;
        if (!emailResult.success) {
          log.error('Failed to send workshop confirmation email', {
            registrationId: registration.id,
            error: emailResult.error,
          });
          // Don't fail the request, the registration was created
        }
      } catch (emailError) {
        log.error('Error sending workshop confirmation email', emailError, {
          registrationId: registration.id,
        });
        // Don't fail the request, the registration was created
      }
    }

    return res.status(201).json({
      success: true,
      registration: {
        id: registration.id,
        workshopId: registration.workshop_id,
        workshopTitle: workshop.title,
        firstName: registration.first_name,
        lastName: registration.last_name,
        email: registration.email,
        amountPaid: registration.amount_paid,
        currency: registration.currency,
        status: registration.status,
        createdAt: registration.created_at,
      },
      emailSent,
    });
  } catch (error) {
    log.error('Admin issue workshop ticket API error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
