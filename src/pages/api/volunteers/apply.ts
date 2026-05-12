/**
 * Volunteer Application Submission API
 * POST: Submit a new volunteer application
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { submitApplication, getRoleById } from '@/lib/volunteer';
import { volunteerApplicationSchema } from '@/lib/validations/volunteer';
import { logger } from '@/lib/logger';
import { notifyVolunteerApplication } from '@/lib/platform-notifications';
import { sendVolunteerApplicationConfirmationEmail } from '@/lib/email';

const log = logger.scope('Volunteer Application API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request body
    const parsed = volunteerApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: parsed.error.issues,
      });
    }

    // Submit application
    const { data, error } = await submitApplication(parsed.data);

    if (error) {
      return res.status(400).json({ error });
    }

    if (!data) {
      return res.status(500).json({ error: 'Failed to submit application' });
    }

    // Fetch role title for email
    const { data: role } = await getRoleById(data.role_id);
    const roleTitle = role?.title || 'Volunteer';

    // Send confirmation + admin notification emails (fire-and-forget)
    sendVolunteerApplicationConfirmationEmail({
      name: `${data.first_name} ${data.last_name}`,
      email: data.email,
      applicationId: data.application_id,
      roleTitle,
      phone: data.phone,
      linkedinUrl: data.linkedin_url,
      motivation: data.motivation,
      availability: data.availability,
      relevantExperience: data.relevant_experience,
      location: data.location || '',
      affiliation: data.affiliation,
      notes: data.notes,
    }).catch((err) => {
      log.error('Failed to send emails', err instanceof Error ? err : null);
    });

    // Send Slack notification (fire-and-forget)
    notifyVolunteerApplication({
      applicationId: data.application_id,
      name: `${data.first_name} ${data.last_name}`,
      email: data.email,
      roleId: data.role_id,
    });

    log.info('Application submitted successfully', {
      applicationId: data.application_id,
      email: data.email,
    });

    return res.status(201).json({
      success: true,
      applicationId: data.application_id,
      message: 'Your volunteer application has been submitted successfully.',
    });
  } catch (err) {
    log.error('Unexpected error', err instanceof Error ? err : null);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
