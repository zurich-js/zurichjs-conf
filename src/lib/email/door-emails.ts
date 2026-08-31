/**
 * Door check-in crew emails.
 *
 * The invitation carries a LINK to the sign-in page, not a magic link itself —
 * the volunteer requests the code from that page. Same two-step shape as the CFP
 * reviewer invitation, and it matters here: Supabase's built-in email service is
 * capped at 2 messages per hour project-wide, so minting a magic link per invite
 * would fail on the third volunteer. Invitations go out over Resend; only the
 * sign-in code goes through Supabase, one volunteer at a time.
 */

import * as React from 'react';
import { render } from '@react-email/render';
import {
  DoorStaffInvitationEmail,
  type DoorStaffInvitationEmailProps,
} from '@/emails/templates/DoorStaffInvitationEmail';
import { retry } from '@/lib/retry';
import { EMAIL_CONFIG, getResendClient, log } from './config';
import type { DoorRole } from '@/lib/types/checkin';

export interface DoorStaffInvitationData {
  to: string;
  staffName?: string;
  role: DoorRole;
}

const ROLE_SUBJECTS: Record<DoorRole, string> = {
  door_lead: 'You’re a door lead for ZurichJS Conference 2026',
  scanner: 'You’re on the check-in crew for ZurichJS Conference 2026',
  goodie: 'You’re on the goodie bag crew for ZurichJS Conference 2026',
};

export async function sendDoorStaffInvitationEmail(
  data: DoorStaffInvitationData
): Promise<{ success: boolean; error?: string }> {
  log.info('Sending door staff invitation', { to: data.to, role: data.role });

  try {
    const resend = getResendClient();

    // Always the canonical production domain: a preview URL here would send
    // volunteers to a deployment that will not exist on the day.
    const loginUrl = `${EMAIL_CONFIG.siteUrl}/checkin/login?email=${encodeURIComponent(data.to)}`;

    const emailProps: DoorStaffInvitationEmailProps = {
      staffName: data.staffName,
      staffEmail: data.to,
      role: data.role,
      loginUrl,
      supportEmail: EMAIL_CONFIG.supportEmail,
    };

    const emailHtml = await render(React.createElement(DoorStaffInvitationEmail, emailProps));

    // Retried per the repo's own rule that outbound calls use @/lib/retry. No
    // other sender under src/lib/email does this yet, and a Resend blip on an
    // invitation is a volunteer who never gets access.
    //
    // Resend RETURNS { error } rather than throwing, so a retryable failure has
    // to be rethrown for retry() to see it at all. A rejected address is
    // returned as-is instead, since retrying it would just burn attempts.
    const result = await retry(
      async () => {
        const attempt = await resend.emails.send({
          from: EMAIL_CONFIG.from,
          to: data.to,
          replyTo: EMAIL_CONFIG.replyTo,
          subject: ROLE_SUBJECTS[data.role],
          html: emailHtml,
        });

        if (attempt.error) {
          const status = (attempt.error as { statusCode?: number }).statusCode;
          const transient = status === undefined || status === 429 || status >= 500;
          if (transient) {
            throw new Error(attempt.error.message);
          }
        }

        return attempt;
      },
      { attempts: 3, label: 'door staff invitation' }
    );

    if (result.error) {
      log.error('Door staff invitation failed', new Error(result.error.message), { to: data.to });
      return { success: false, error: result.error.message };
    }

    log.info('Door staff invitation sent', { to: data.to, role: data.role });
    return { success: true };
  } catch (error) {
    log.error('Door staff invitation threw', error, { to: data.to });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
