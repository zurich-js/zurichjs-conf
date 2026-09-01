/**
 * Reassign Workshop Registration API
 * POST /api/admin/workshops/[id]/registrants/[registrationId]/reassign
 */

import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { ErrorCodes, HttpError, throwIfDbError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { sendWorkshopConfirmationEmail } from '@/lib/email';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import { generateWorkshopPDF, imageUrlToDataUrl } from '@/lib/pdf';
import { generateAndStoreWorkshopQRCode, generateTicketQRCode } from '@/lib/qrcode';

const bodySchema = z.object({
  email: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export default withApiHandler(
  { scope: 'Reassign Workshop Registration API', methods: ['POST'], bodySchema },
  async (req, res, { log, body }) => {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      throw new HttpError(401, 'Unauthorized', { code: ErrorCodes.AUTH_REQUIRED });
    }

    const { id, registrationId } = req.query;
    if (typeof id !== 'string' || typeof registrationId !== 'string') {
      throw new HttpError(400, 'Invalid IDs');
    }

    const { email, firstName, lastName } = body;

    const supabase = createServiceRoleClient();

    const { data: registration, error } = await supabase
      .from('workshop_registrations')
      .select('*')
      .eq('id', registrationId)
      .eq('workshop_id', id)
      .single();

    if (error || !registration) {
      throw new HttpError(404, 'Registration not found', {
        code: ErrorCodes.NOT_FOUND,
        cause: error,
        context: { workshopId: id, registrationId },
      });
    }

    const { error: updateError } = await supabase
      .from('workshop_registrations')
      .update({
        email,
        first_name: firstName,
        last_name: lastName,
      })
      .eq('id', registrationId);

    throwIfDbError(updateError, 'Failed to reassign workshop registration', {
      context: { workshopId: id, registrationId },
    });

    // Send confirmation email to the new attendee. The reassignment itself has
    // already succeeded — a failure anywhere in this block must not fail the
    // request, but it must be visible: the new owner has no confirmation email
    // until it is re-sent.
    let emailSent = false;
    try {
      const { data: workshop, error: workshopError } = await supabase
        .from('workshops')
        .select('*')
        .eq('id', id)
        .single();

      if (workshopError || !workshop) {
        log.warn('Workshop not found for reassignment confirmation email — skipping email', {
          workshopId: id,
          registrationId,
          reason: workshopError?.message,
        });
      } else {
        let instructorName: string | null = null;
        let workshopSlug: string | null = null;
        if (workshop.cfp_submission_id) {
          const { speakers } = await fetchPublicSpeakers();
          for (const speaker of speakers) {
            const match = speaker.sessions.find((s) => s.id === workshop.cfp_submission_id);
            if (match) {
              instructorName = [speaker.first_name, speaker.last_name].filter(Boolean).join(' ');
              if (match.type === 'workshop') workshopSlug = match.slug;
              break;
            }
          }
        }

        let qrCodeUrl = registration.qr_code_url;
        if (!qrCodeUrl) {
          const qrResult = await generateAndStoreWorkshopQRCode(registration.id);
          if (qrResult.success && qrResult.url) {
            qrCodeUrl = qrResult.url;
            await supabase
              .from('workshop_registrations')
              .update({ qr_code_url: qrCodeUrl })
              .eq('id', registrationId);
          }
        }

        let pdfAttachment: Buffer | undefined;
        if (qrCodeUrl) {
          try {
            const qrDataUrl = qrCodeUrl.startsWith('data:')
              ? qrCodeUrl
              : await imageUrlToDataUrl(qrCodeUrl).catch(() => generateTicketQRCode(registration.id));

            pdfAttachment = await generateWorkshopPDF({
              registrationId: registration.id,
              attendeeName: `${firstName} ${lastName}`.trim(),
              attendeeEmail: email,
              workshopTitle: workshop.title,
              instructorName,
              workshopDate: workshop.date ?? 'September 10, 2026',
              amountPaid: registration.amount_paid,
              currency: registration.currency,
              qrCodeDataUrl: qrDataUrl,
            });
          } catch (pdfError) {
            log.warn('Failed to generate reassigned workshop PDF', {
              workshopId: id,
              registrationId,
              reason: pdfError instanceof Error ? pdfError.message : String(pdfError),
            });
          }
        }

        const emailResult = await sendWorkshopConfirmationEmail({
          to: email,
          firstName,
          workshopTitle: workshop.title,
          workshopDescription: workshop.description,
          instructorName,
          date: workshop.date,
          amountPaid: registration.amount_paid,
          currency: registration.currency,
          seatIndex: registration.seat_index ?? 0,
          totalSeats: 1,
          workshopSlug,
          qrCodeUrl,
          pdfAttachment,
        });

        if (emailResult.success) {
          emailSent = true;
        } else {
          log.error('Registration reassigned but confirmation email failed', emailResult.error, {
            code: ErrorCodes.TICKET_EMAIL_FAILED,
            fingerprint: 'workshop-reassign-email-failed',
            workshopId: id,
            registrationId,
            newAttendeeEmail: email,
          });
        }
      }
    } catch (emailError) {
      log.error('Registration reassigned but confirmation email failed', emailError, {
        code: ErrorCodes.TICKET_EMAIL_FAILED,
        fingerprint: 'workshop-reassign-email-failed',
        workshopId: id,
        registrationId,
        newAttendeeEmail: email,
      });
    }

    return res.status(200).json({
      success: true,
      message: emailSent
        ? 'Registration reassigned successfully'
        : 'Registration reassigned, but the confirmation email failed to send — resend it from the registrants page.',
    });
  }
);
