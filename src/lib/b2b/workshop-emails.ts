/**
 * B2B Workshop Confirmation Emails
 * Sends workshop seat confirmations (with QR + PDF) for registrations
 * created when a B2B invoice is marked as paid. Mirrors the admin
 * resend endpoint so B2B attendees get the same email as direct buyers.
 */

import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { sendWorkshopConfirmationEmail } from '@/lib/email';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import { generateWorkshopPDF, imageUrlToDataUrl } from '@/lib/pdf';
import type { Workshop, WorkshopRegistration } from '@/lib/types/database';

const log = logger.scope('B2B Workshop Emails');

export interface B2BWorkshopEmailTarget {
  registrationId: string;
  workshopId: string;
  attendeeName: string;
  attendeeEmail: string;
}

export interface B2BWorkshopEmailResult {
  emailsSent: number;
  emailsFailed: number;
  failures: Array<{ attendeeEmail: string; attendeeName: string; reason: string }>;
}

interface WorkshopSessionInfo {
  instructorName: string | null;
  slug: string | null;
}

/**
 * Resolve instructor names and public workshop page slugs for a set of
 * workshops from the public speaker lineup. Best-effort — email sending
 * proceeds without them on failure.
 */
async function resolveWorkshopSessionInfo(
  workshops: Workshop[]
): Promise<Map<string, WorkshopSessionInfo>> {
  const infoByWorkshopId = new Map<string, WorkshopSessionInfo>();

  try {
    const { speakers } = await fetchPublicSpeakers();
    for (const workshop of workshops) {
      for (const speaker of speakers) {
        const match = speaker.sessions.find(
          (session) =>
            (workshop.session_id && session.id === workshop.session_id) ||
            (workshop.cfp_submission_id &&
              (session.cfp_submission_id === workshop.cfp_submission_id ||
                session.id === workshop.cfp_submission_id))
        );
        if (match) {
          const name = [speaker.first_name, speaker.last_name].filter(Boolean).join(' ');
          infoByWorkshopId.set(workshop.id, {
            instructorName: name || null,
            slug: match.type === 'workshop' ? match.slug : null,
          });
          break;
        }
      }
    }
  } catch (error) {
    log.warn('Failed to resolve workshop session info', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return infoByWorkshopId;
}

/**
 * Send a workshop confirmation email (with QR code and PDF attachment when
 * available) for each created registration.
 */
export async function sendB2BWorkshopConfirmationEmails(
  targets: B2BWorkshopEmailTarget[]
): Promise<B2BWorkshopEmailResult> {
  const result: B2BWorkshopEmailResult = { emailsSent: 0, emailsFailed: 0, failures: [] };
  if (targets.length === 0) return result;

  const supabase = createServiceRoleClient();

  // Load the involved workshops once
  const workshopIds = [...new Set(targets.map((t) => t.workshopId))];
  const { data: workshopRows, error: workshopsError } = await supabase
    .from('workshops')
    .select('*')
    .in('id', workshopIds);

  if (workshopsError) {
    log.error('Failed to load workshops for confirmation emails', workshopsError, {
      workshopIds,
    });
    result.emailsFailed = targets.length;
    result.failures = targets.map((t) => ({
      attendeeEmail: t.attendeeEmail,
      attendeeName: t.attendeeName,
      reason: `Failed to load workshop details: ${workshopsError.message}`,
    }));
    return result;
  }

  const workshops = (workshopRows || []) as Workshop[];
  const workshopById = new Map(workshops.map((w) => [w.id, w]));
  const sessionInfoByWorkshopId = await resolveWorkshopSessionInfo(workshops);

  for (const target of targets) {
    const workshop = workshopById.get(target.workshopId);

    try {
      if (!workshop) {
        throw new Error('Workshop not found');
      }

      const { data: registration, error: registrationError } = await supabase
        .from('workshop_registrations')
        .select('*')
        .eq('id', target.registrationId)
        .single();

      if (registrationError || !registration) {
        throw new Error(registrationError?.message || 'Registration not found');
      }

      const reg = registration as WorkshopRegistration;
      const sessionInfo = sessionInfoByWorkshopId.get(workshop.id);
      const instructorName = sessionInfo?.instructorName ?? null;

      // PDF attachment is best-effort — the email still carries the QR code
      let pdfAttachment: Buffer | undefined;
      if (reg.qr_code_url) {
        try {
          const qrDataUrl = reg.qr_code_url.startsWith('data:')
            ? reg.qr_code_url
            : await imageUrlToDataUrl(reg.qr_code_url);

          pdfAttachment = await generateWorkshopPDF({
            registrationId: reg.id,
            attendeeName: target.attendeeName,
            attendeeEmail: target.attendeeEmail,
            workshopTitle: workshop.title,
            instructorName,
            workshopDate: workshop.date ?? 'September 10, 2026',
            amountPaid: reg.amount_paid,
            currency: reg.currency,
            qrCodeDataUrl: qrDataUrl,
          });
        } catch (pdfError) {
          log.warn('Failed to generate workshop PDF, sending email without attachment', {
            registrationId: reg.id,
            error: pdfError instanceof Error ? pdfError.message : 'Unknown error',
          });
        }
      }

      const emailResult = await sendWorkshopConfirmationEmail({
        to: target.attendeeEmail,
        firstName: reg.first_name || target.attendeeName.split(' ')[0] || 'there',
        workshopTitle: workshop.title,
        workshopDescription: workshop.description,
        instructorName,
        date: workshop.date,
        amountPaid: reg.amount_paid,
        currency: reg.currency,
        seatIndex: reg.seat_index ?? 0,
        totalSeats: 1,
        workshopSlug: sessionInfo?.slug ?? null,
        qrCodeUrl: reg.qr_code_url,
        pdfAttachment,
      });

      if (!emailResult.success) {
        throw new Error(emailResult.error || 'Unknown email sending error');
      }

      result.emailsSent++;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to send B2B workshop confirmation email', error, {
        registrationId: target.registrationId,
        workshopId: target.workshopId,
      });
      result.emailsFailed++;
      result.failures.push({
        attendeeEmail: target.attendeeEmail,
        attendeeName: target.attendeeName,
        reason: `Workshop "${workshop?.title ?? target.workshopId}": ${reason}`,
      });
    }
  }

  return result;
}
