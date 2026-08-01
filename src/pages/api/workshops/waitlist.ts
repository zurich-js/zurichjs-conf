/**
 * Workshop Waitlist API
 * Adds an email to the Resend contacts for a sold-out workshop and sends a
 * Slack notification. Mirrors /api/tickets/waitlist.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { addWorkshopWaitlistContact, sendWorkshopWaitlistConfirmationEmail } from '@/lib/email';
import { notifyWorkshopWaitlist } from '@/lib/platform-notifications/send';
import { serverAnalytics } from '@/lib/analytics/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { WorkshopStatus } from '@/lib/types/database';

const log = logger.scope('Workshop Waitlist API');

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  workshopId: z.string().uuid('A valid workshop is required'),
});

interface WaitlistResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WaitlistResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid input',
      });
    }

    const { email, workshopId } = parsed.data;

    // Resolve the title server-side — never trust a client-supplied workshop name.
    const supabase = createServiceRoleClient();
    const { data: workshop, error: workshopError } = await supabase
      .from('workshops')
      .select('id, title, status')
      .eq('id', workshopId)
      .maybeSingle();

    if (workshopError) {
      log.error('Failed to load workshop for waitlist signup', workshopError, { workshopId });
      return res.status(500).json({
        success: false,
        error: 'An error occurred while joining the waitlist',
      });
    }

    if (!workshop || (workshop.status as WorkshopStatus) !== 'published') {
      return res.status(404).json({
        success: false,
        error: 'This workshop is not available.',
      });
    }

    const result = await addWorkshopWaitlistContact(email);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to join waitlist',
      });
    }

    // Fire-and-forget Slack notification. This is the record of *which* workshop
    // the signup was for — the Resend contact itself carries no workshop context.
    notifyWorkshopWaitlist({
      email,
      workshopId: workshop.id,
      workshopTitle: workshop.title,
    });

    // Send confirmation email. Don't fail the request if it errors — the
    // subscriber is already on the waitlist; the email is best-effort.
    await sendWorkshopWaitlistConfirmationEmail(email, workshop.title);

    await serverAnalytics.flush();

    return res.status(200).json({
      success: true,
      message: 'Successfully joined the workshop waitlist',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await serverAnalytics.error('anonymous', errorMessage, {
      type: 'system',
      severity: 'high',
      code: 'WORKSHOP_WAITLIST_API_ERROR',
    });

    await serverAnalytics.flush();

    return res.status(500).json({
      success: false,
      error: 'An error occurred while joining the waitlist',
    });
  }
}
