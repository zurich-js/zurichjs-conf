/**
 * Resend Workshop Confirmation Email API
 * POST /api/admin/workshops/[id]/registrants/[registrationId]/resend
 */

import { withApiHandler } from '@/lib/api/handler';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { EmailDeliveryError, ErrorCodes, HttpError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { sendWorkshopConfirmationEmail } from '@/lib/email';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import { generateWorkshopPDF, imageUrlToDataUrl } from '@/lib/pdf';
import { generateAndStoreWorkshopQRCode, generateTicketQRCode } from '@/lib/qrcode';

export default withApiHandler(
  { scope: 'Resend Workshop Confirmation Email API', methods: ['POST'] },
  async (req, res, { log }) => {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      throw new HttpError(401, 'Unauthorized', { code: ErrorCodes.AUTH_REQUIRED });
    }

    const { id, registrationId } = req.query;
    if (typeof id !== 'string' || typeof registrationId !== 'string') {
      throw new HttpError(400, 'Invalid IDs');
    }

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

    if (!registration.email) {
      throw new HttpError(400, 'Registration has no email address');
    }

    const { data: workshop, error: workshopError } = await supabase
      .from('workshops')
      .select('*')
      .eq('id', id)
      .single();

    if (workshopError || !workshop) {
      throw new HttpError(404, 'Workshop not found', {
        code: ErrorCodes.NOT_FOUND,
        cause: workshopError,
        context: { workshopId: id, registrationId },
      });
    }

    // Resolve instructor name + public workshop page slug
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
          attendeeName: `${registration.first_name ?? ''} ${registration.last_name ?? ''}`.trim(),
          attendeeEmail: registration.email,
          workshopTitle: workshop.title,
          instructorName,
          workshopDate: workshop.date ?? 'September 10, 2026',
          amountPaid: registration.amount_paid,
          currency: registration.currency,
          qrCodeDataUrl: qrDataUrl,
        });
      } catch (pdfError) {
        log.warn('Failed to generate resent workshop PDF', {
          workshopId: id,
          registrationId,
          reason: pdfError instanceof Error ? pdfError.message : String(pdfError),
        });
      }
    }

    const emailResult = await sendWorkshopConfirmationEmail({
      to: registration.email,
      firstName: registration.first_name || 'there',
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

    if (!emailResult.success) {
      throw new EmailDeliveryError('Failed to resend workshop confirmation email', {
        cause: emailResult.error,
        context: { workshopId: id, registrationId, attendeeEmail: registration.email },
      });
    }

    return res.status(200).json({ success: true, message: 'Confirmation email resent successfully' });
  }
);
