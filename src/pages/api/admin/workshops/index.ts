/**
 * Admin Workshops API
 * GET  /api/admin/workshops       — list accepted CFP workshop submissions + any linked offering,
 *                                    joined with enrollment counts for a glanceable dashboard.
 * POST /api/admin/workshops       — create or link a workshop offering to a CFP submission.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { getAllWorkshopRevenue } from '@/lib/workshops/getRevenue';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import type { Database, Workshop, WorkshopStatus } from '@/lib/types/database';
import { logger } from '@/lib/logger';
import {
  CreateOfferingSchema,
  auditAdminWorkshopMutation,
} from '@/lib/admin/workshopValidation';

const log = logger.scope('Admin Workshops API');

export interface AdminWorkshopListItem {
  cfpSubmissionId: string;
  submissionTitle: string;
  submissionAbstract: string;
  submissionStatus: string;
  speakerName: string | null;
  cfpDurationHours: number | null;
  /**
   * Session slug used by /workshops/[slug]. Resolved from fetchPublicSpeakers()
   * so the admin "View public page" link matches what the detail page expects.
   * Null when the submission isn't visible in the public speaker lineup yet.
   */
  sessionSlug: string | null;
  offering: Workshop | null;
  registrantCount: number;
  revenueByCurrency: Array<{ currency: string; grossCents: number; registrations: number }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const access = verifyAdminAccess(req);
  if (!access.authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') return handleList(req, res);
  if (req.method === 'POST') return handleCreate(req, res, access);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleList(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createServiceRoleClient();

    // Accepted CFP workshop submissions (the candidate list).
    const { data: submissions, error: submissionsError } = await supabase
      .from('cfp_submissions')
      .select(`
        id,
        title,
        abstract,
        status,
        workshop_duration_hours,
        speaker:cfp_speakers!cfp_submissions_speaker_id_fkey(first_name, last_name)
      `)
      .eq('submission_type', 'workshop')
      .eq('status', 'accepted');

    if (submissionsError) {
      log.error('Error loading accepted workshop submissions', submissionsError);
      return res.status(500).json({ error: submissionsError.message });
    }

    // All workshop offerings — including those manually added for invited
    // speakers (no cfp_submission_id) and those whose linked CFP submission
    // is not in the accepted set.
    const { data: offerings, error: offeringsError } = await supabase
      .from('workshops')
      .select('*');

    if (offeringsError) {
      log.error('Error loading workshop offerings', offeringsError);
      return res.status(500).json({ error: offeringsError.message });
    }

    const allOfferings = (offerings ?? []) as Workshop[];
    const offeringBySubmission = new Map<string, Workshop>();
    for (const row of allOfferings) {
      if (row.cfp_submission_id) offeringBySubmission.set(row.cfp_submission_id, row);
    }

    const revenueByWorkshop = await getAllWorkshopRevenue();

    // Resolve the public session slug + speaker label by looking it up in
    // fetchPublicSpeakers so the admin link matches the detail page. We key
    // by both cfp_submission_id and program_session.id because manually-added
    // workshops may only have a program_session link.
    const { speakers } = await fetchPublicSpeakers();
    const slugBySubmissionId = new Map<string, string>();
    const slugByProgramSessionId = new Map<string, string>();
    const speakerNameBySubmissionId = new Map<string, string>();
    const speakerNameByProgramSessionId = new Map<string, string>();
    for (const speaker of speakers) {
      const speakerName = `${speaker.first_name ?? ''} ${speaker.last_name ?? ''}`.trim();
      for (const session of speaker.sessions) {
        if (session.type !== 'workshop') continue;
        slugByProgramSessionId.set(session.id, session.slug);
        if (speakerName) speakerNameByProgramSessionId.set(session.id, speakerName);
        if (session.cfp_submission_id) {
          slugBySubmissionId.set(session.cfp_submission_id, session.slug);
          if (speakerName) speakerNameBySubmissionId.set(session.cfp_submission_id, speakerName);
        }
      }
    }

    const usedOfferingIds = new Set<string>();

    const items: AdminWorkshopListItem[] = (submissions ?? []).map((submission) => {
      const speaker = Array.isArray(submission.speaker) ? submission.speaker[0] : submission.speaker;
      const offering = offeringBySubmission.get(submission.id) ?? null;
      if (offering) usedOfferingIds.add(offering.id);
      const revenue = offering ? revenueByWorkshop.get(offering.id) : undefined;
      return {
        cfpSubmissionId: submission.id,
        submissionTitle: submission.title,
        submissionAbstract: submission.abstract,
        submissionStatus: submission.status,
        speakerName: speaker ? `${speaker.first_name ?? ''} ${speaker.last_name ?? ''}`.trim() : null,
        cfpDurationHours: submission.workshop_duration_hours ?? null,
        sessionSlug: slugBySubmissionId.get(submission.id) ?? null,
        offering,
        registrantCount: revenue?.totalRegistrations ?? 0,
        revenueByCurrency:
          revenue?.byCurrency.map(({ currency, grossCents, registrations }) => ({
            currency,
            grossCents,
            registrations,
          })) ?? [],
      };
    });

    // Orphan offerings: manually-added workshops (no CFP link) or workshops
    // whose linked CFP submission isn't in the accepted set. Surface them so
    // admins can manage registrations and configuration from the same view.
    for (const offering of allOfferings) {
      if (usedOfferingIds.has(offering.id)) continue;
      const revenue = revenueByWorkshop.get(offering.id);
      const sessionId = offering.session_id ?? null;
      const cfpId = offering.cfp_submission_id;
      const sessionSlug =
        (sessionId ? slugByProgramSessionId.get(sessionId) : null)
        ?? (cfpId ? slugBySubmissionId.get(cfpId) : null)
        ?? null;
      const speakerName =
        (sessionId ? speakerNameByProgramSessionId.get(sessionId) : null)
        ?? (cfpId ? speakerNameBySubmissionId.get(cfpId) : null)
        ?? null;
      items.push({
        cfpSubmissionId: cfpId ?? '',
        submissionTitle: offering.title,
        submissionAbstract: offering.description,
        submissionStatus: offering.status,
        speakerName,
        cfpDurationHours: null,
        sessionSlug,
        offering,
        registrantCount: revenue?.totalRegistrations ?? 0,
        revenueByCurrency:
          revenue?.byCurrency.map(({ currency, grossCents, registrations }) => ({
            currency,
            grossCents,
            registrations,
          })) ?? [],
      });
    }

    return res.status(200).json({ items });
  } catch (error) {
    log.error('Unexpected error listing workshops', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list workshops',
    });
  }
}

async function handleCreate(
  req: NextApiRequest,
  res: NextApiResponse,
  access: ReturnType<typeof verifyAdminAccess>
) {
  try {
    const parsed = CreateOfferingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    const body = parsed.data;

    const supabase = createServiceRoleClient();

    const { data: submission, error: submissionError } = await supabase
      .from('cfp_submissions')
      .select('id, title, abstract, workshop_duration_hours, workshop_max_participants')
      .eq('id', body.cfpSubmissionId)
      .eq('submission_type', 'workshop')
      .eq('status', 'accepted')
      .maybeSingle();

    if (submissionError) {
      log.error('Error loading submission for offering create', submissionError);
      return res.status(500).json({ error: submissionError.message });
    }
    if (!submission) {
      return res.status(404).json({ error: 'Accepted workshop submission not found' });
    }

    const { data: existing } = await supabase
      .from('workshops')
      .select('*')
      .eq('cfp_submission_id', body.cfpSubmissionId)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Offering already exists for this submission', offering: existing });
    }

    const defaultCapacity = submission.workshop_max_participants ?? 20;
    const defaultDurationMinutes = submission.workshop_duration_hours
      ? Math.round(submission.workshop_duration_hours * 60)
      : null;
    const { data: linkedProgramSession } = await supabase
      .from('program_sessions')
      .select('id')
      .eq('cfp_submission_id', body.cfpSubmissionId)
      .maybeSingle();

    const workshopInsert: Database['public']['Tables']['workshops']['Insert'] = {
      session_id: linkedProgramSession?.id ?? null,
      cfp_submission_id: body.cfpSubmissionId,
      title: body.title ?? submission.title,
      description: body.description ?? submission.abstract,
      capacity: body.capacity ?? defaultCapacity,
      duration_minutes: body.durationMinutes ?? defaultDurationMinutes,
      room: body.room ?? null,
      stripe_product_id: body.stripeProductId ?? null,
      stripe_price_lookup_key: body.stripePriceLookupKey ?? null,
      status: (body.status ?? 'draft') satisfies WorkshopStatus,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('workshops')
      .insert(workshopInsert)
      .select()
      .single();

    if (insertError || !inserted) {
      log.error('Error inserting workshop offering', insertError);
      return res.status(500).json({ error: insertError?.message ?? 'Failed to insert offering' });
    }

    auditAdminWorkshopMutation({
      access,
      action: 'workshop.created',
      workshopId: inserted.id,
      cfpSubmissionId: inserted.cfp_submission_id,
      after: inserted,
    });

    return res.status(201).json({ offering: inserted });
  } catch (error) {
    log.error('Unexpected error creating workshop offering', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create offering',
    });
  }
}
