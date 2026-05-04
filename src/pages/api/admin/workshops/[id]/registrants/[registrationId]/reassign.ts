/**
 * Reassign Workshop Registration API
 * POST /api/admin/workshops/[id]/registrants/[registrationId]/reassign
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { sendWorkshopConfirmationEmail } from '@/lib/email';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import { generateWorkshopPDF, imageUrlToDataUrl } from '@/lib/pdf';
import { generateAndStoreWorkshopQRCode, generateTicketQRCode } from '@/lib/qrcode';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, registrationId } = req.query;
    const { email, firstName, lastName } = req.body;

    if (typeof id !== 'string' || typeof registrationId !== 'string') {
      return res.status(400).json({ error: 'Invalid IDs' });
    }

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, first name, and last name are required' });
    }

    const supabase = createServiceRoleClient();

    const { data: registration, error } = await supabase
      .from('workshop_registrations')
      .select('*')
      .eq('id', registrationId)
      .eq('workshop_id', id)
      .single();

    if (error || !registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const { error: updateError } = await supabase
      .from('workshop_registrations')
      .update({
        email,
        first_name: firstName,
        last_name: lastName,
      })
      .eq('id', registrationId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to reassign registration' });
    }

    // Send confirmation email to new attendee
    const { data: workshop } = await supabase
      .from('workshops')
      .select('*')
      .eq('id', id)
      .single();

    if (workshop) {
      let instructorName: string | null = null;
      if (workshop.cfp_submission_id) {
        const { speakers } = await fetchPublicSpeakers();
        for (const speaker of speakers) {
          const match = speaker.sessions.find((s) => s.id === workshop.cfp_submission_id);
          if (match) {
            instructorName = [speaker.first_name, speaker.last_name].filter(Boolean).join(' ');
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

      const timeRange = workshop.start_time && workshop.end_time
        ? `${workshop.start_time.slice(0, 5)} – ${workshop.end_time.slice(0, 5)}`
        : workshop.start_time?.slice(0, 5) ?? null;

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
            workshopTime: timeRange,
            room: workshop.room,
            amountPaid: registration.amount_paid,
            currency: registration.currency,
            qrCodeDataUrl: qrDataUrl,
          });
        } catch (pdfError) {
          console.warn('Failed to generate reassigned workshop PDF:', pdfError);
        }
      }

      await sendWorkshopConfirmationEmail({
        to: email,
        firstName,
        workshopTitle: workshop.title,
        workshopDescription: workshop.description,
        instructorName,
        date: workshop.date,
        startTime: workshop.start_time,
        endTime: workshop.end_time,
        room: workshop.room,
        amountPaid: registration.amount_paid,
        currency: registration.currency,
        seatIndex: registration.seat_index ?? 0,
        totalSeats: 1,
        workshopSlug: null,
        qrCodeUrl,
        pdfAttachment,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Registration reassigned successfully',
    });
  } catch (error) {
    console.error('Reassign registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
