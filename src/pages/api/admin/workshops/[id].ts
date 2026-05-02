/**
 * Admin Workshop Offering (single)
 * GET    /api/admin/workshops/:id — fetch one offering
 * PATCH  /api/admin/workshops/:id — update offering
 * DELETE /api/admin/workshops/:id — soft delete (status=archived)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { env } from '@/config/env';
import { createServiceRoleClient } from '@/lib/supabase';
import type { Json, TablesUpdate } from '@/lib/types/database.generated';
import type { Workshop, WorkshopStatus } from '@/lib/types/database';
import { logger } from '@/lib/logger';
import { validateSchedule } from '@/lib/workshops/scheduleHelpers';
import {
  PatchOfferingSchema,
  auditAdminWorkshopMutation,
  canTransition,
} from '@/lib/admin/workshopValidation';

const log = logger.scope('Admin Workshop API');

function createProgramScheduleClient() {
  return createClient(
    env.supabase.url,
    env.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const access = verifyAdminAccess(req);
  if (!access.authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (typeof id !== 'string' || !id) {
    return res.status(400).json({ error: 'Invalid workshop id' });
  }

  if (req.method === 'GET') return handleGet(id, res);
  if (req.method === 'PATCH') return handlePatch(id, req, res, access);
  if (req.method === 'DELETE') return handleDelete(id, res, access);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGet(id: string, res: NextApiResponse) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('workshops')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    log.error('Error fetching workshop offering', error);
    return res.status(500).json({ error: error.message });
  }
  if (!data) return res.status(404).json({ error: 'Workshop not found' });
  return res.status(200).json({ offering: data as Workshop });
}

async function handlePatch(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse,
  access: ReturnType<typeof verifyAdminAccess>
) {
  const parsed = PatchOfferingSchema.safeParse(req.body);
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

  // Load existing to validate status transition + capture audit "before" snapshot.
  const { data: current, error: currentError } = await supabase
    .from('workshops')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (currentError) {
    log.error('Error loading workshop for PATCH', currentError, { workshopId: id });
    return res.status(500).json({ error: currentError.message });
  }
  if (!current) return res.status(404).json({ error: 'Workshop not found' });

  if (body.status && body.status !== current.status) {
    if (!canTransition(current.status as WorkshopStatus, body.status)) {
      return res.status(400).json({
        error: `Cannot transition from "${current.status}" to "${body.status}".`,
      });
    }
  }

  const scheduleProvided =
    body.date !== undefined || body.startTime !== undefined || body.endTime !== undefined;

  const updates: TablesUpdate<'workshops'> = {};
  if (body.room !== undefined) updates.room = body.room;
  if (body.capacity !== undefined) updates.capacity = body.capacity;
  if (body.stripeProductId !== undefined) updates.stripe_product_id = body.stripeProductId;
  if (body.stripePriceLookupKey !== undefined) {
    updates.stripe_price_lookup_key = body.stripePriceLookupKey;
  }
  if (body.stripeValidation !== undefined) {
    const currentMetadata =
      current.metadata && typeof current.metadata === 'object' && !Array.isArray(current.metadata)
        ? current.metadata as Record<string, Json | undefined>
        : {};
    updates.metadata = {
      ...currentMetadata,
      stripeValidation: body.stripeValidation,
    } as Json;
  }
  if (body.status !== undefined) updates.status = body.status;
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;

  let scheduleUpdate:
    | {
        date: string | null;
        startTime: string | null;
        endTime: string | null;
        durationMinutes: number | null;
      }
    | null = null;

  if (scheduleProvided) {
    const result = validateSchedule({
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
    });
    if (!result.ok) return res.status(400).json({ error: result.error });

    scheduleUpdate = {
      date: result.date,
      startTime: result.startTime,
      endTime: result.endTime,
      durationMinutes: result.durationMinutes,
    };
    updates.date = result.date;
    updates.start_time = result.startTime;
    updates.end_time = result.endTime;
    updates.duration_minutes = result.durationMinutes;
  }

  const { data, error } = await supabase
    .from('workshops')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    log.error('Error updating workshop offering', error, { workshopId: id });
    return res.status(500).json({ error: error.message });
  }
  if (!data) return res.status(404).json({ error: 'Workshop not found' });

  // Mirror schedule onto the linked CFP submission.
  if (scheduleUpdate && data.cfp_submission_id) {
    const { error: submissionError } = await supabase
      .from('cfp_submissions')
      .update({
        scheduled_date: scheduleUpdate.date,
        scheduled_start_time: scheduleUpdate.startTime,
        scheduled_duration_minutes: scheduleUpdate.durationMinutes,
        room: body.room !== undefined ? body.room : undefined,
      })
      .eq('id', data.cfp_submission_id);

    if (submissionError) {
      log.warn('Failed to mirror schedule to cfp_submissions', {
        error: submissionError.message,
        submissionId: data.cfp_submission_id,
      });
    }
  }

  if (scheduleUpdate && (data.cfp_submission_id || data.session_id)) {
    await syncProgramScheduleForWorkshop(data as Workshop, scheduleUpdate, {
      publish: body.status === 'published',
    });
  }

  auditAdminWorkshopMutation({
    access,
    action: 'workshop.updated',
    workshopId: id,
    cfpSubmissionId: data.cfp_submission_id,
    before: current,
    after: data,
    details: { changedKeys: Object.keys(updates) },
  });

  return res.status(200).json({ offering: data as Workshop });
}

async function syncProgramScheduleForWorkshop(
  workshop: Workshop,
  schedule: {
    date: string | null;
    startTime: string | null;
    endTime: string | null;
    durationMinutes: number | null;
  },
  options: { publish: boolean }
) {
  if (!workshop.cfp_submission_id && !workshop.session_id) return;
  if (!schedule.date || !schedule.startTime || !schedule.durationMinutes) return;

  const supabase = createProgramScheduleClient();
  const { data: existing, error: existingError } = await supabase
    .from('program_schedule_items')
    .select('id, is_visible')
    .or([
      workshop.session_id ? `session_id.eq.${workshop.session_id}` : null,
      workshop.cfp_submission_id ? `submission_id.eq.${workshop.cfp_submission_id}` : null,
    ].filter(Boolean).join(','))
    .limit(1)
    .maybeSingle();

  if (existingError) {
    log.warn('Failed to load program schedule row for workshop sync', {
      error: existingError.message,
      submissionId: workshop.cfp_submission_id,
    });
    return;
  }

  const schedulePayload = {
    date: schedule.date,
    start_time: schedule.startTime,
    duration_minutes: schedule.durationMinutes,
    room: workshop.room,
    type: 'session',
    title: workshop.title,
    description: workshop.description,
    submission_id: workshop.cfp_submission_id,
    session_id: workshop.session_id,
    is_visible: options.publish ? true : existing?.is_visible ?? false,
  };

  const result = existing
    ? await supabase
        .from('program_schedule_items')
        .update({
          ...schedulePayload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    : await supabase
        .from('program_schedule_items')
        .insert(schedulePayload);

  if (result.error) {
    log.warn('Failed to sync program schedule row for workshop', {
      error: result.error.message,
      workshopId: workshop.id,
      submissionId: workshop.cfp_submission_id,
    });
  }
}

async function handleDelete(
  id: string,
  res: NextApiResponse,
  access: ReturnType<typeof verifyAdminAccess>
) {
  const supabase = createServiceRoleClient();

  const { data: current } = await supabase
    .from('workshops')
    .select('status, cfp_submission_id')
    .eq('id', id)
    .maybeSingle();

  if (!current) return res.status(404).json({ error: 'Workshop not found' });
  if (!canTransition(current.status as WorkshopStatus, 'archived')) {
    return res.status(400).json({
      error: `Cannot archive from status "${current.status}".`,
    });
  }

  const { data, error } = await supabase
    .from('workshops')
    .update({ status: 'archived' satisfies WorkshopStatus })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    log.error('Error archiving workshop offering', error, { workshopId: id });
    return res.status(500).json({ error: error.message });
  }
  if (!data) return res.status(404).json({ error: 'Workshop not found' });

  auditAdminWorkshopMutation({
    access,
    action: 'workshop.archived',
    workshopId: id,
    cfpSubmissionId: data.cfp_submission_id,
    before: current,
    after: { status: 'archived' },
  });

  return res.status(200).json({ offering: data as Workshop });
}
