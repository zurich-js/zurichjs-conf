import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import type { PublicSession, PublicSessionSpeaker, PublicSpeaker } from '@/lib/types/cfp';
import type {
  ProgramScheduleItemInput,
  ProgramScheduleItemRecord,
  PublicProgramScheduleItem,
  PublicSpeakerSessionMapEntry,
} from '@/lib/types/program-schedule';

function createProgramServiceClient() {
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

async function syncSubmissionScheduleFields(
  submissionId: string,
  schedule:
    | {
        date: string;
        start_time: string;
        duration_minutes: number;
        room: string | null;
      }
    | null
) {
  const supabase = createProgramServiceClient();
  const { error } = await supabase
    .from('cfp_submissions')
    .update({
      scheduled_date: schedule?.date ?? null,
      scheduled_start_time: schedule?.start_time ?? null,
      scheduled_duration_minutes: schedule?.duration_minutes ?? null,
      room: schedule?.room ?? null,
    })
    .eq('id', submissionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

async function getSubmissionIdForSession(sessionId: string | null | undefined) {
  if (!sessionId) return null;

  const supabase = createProgramServiceClient();
  const { data, error } = await supabase
    .from('program_sessions')
    .select('cfp_submission_id')
    .eq('id', sessionId)
    .maybeSingle();

  if (error || !data?.cfp_submission_id) return null;
  return data.cfp_submission_id as string;
}

async function resolveScheduleSubmissionId(input: {
  session_id?: string | null;
  submission_id?: string | null;
}) {
  return input.session_id
    ? await getSubmissionIdForSession(input.session_id)
    : input.submission_id ?? null;
}

function buildPublicSpeakerSessionMap(speakers: PublicSpeaker[]) {
  const sessionMap = new Map<string, PublicSpeakerSessionMapEntry>();

  for (const speaker of speakers) {
    const name = [speaker.first_name, speaker.last_name].filter(Boolean).join(' ');
    const role = [speaker.job_title, speaker.company].filter(Boolean).join(' @ ');

    for (const session of speaker.sessions) {
      if (!sessionMap.has(session.id)) {
        sessionMap.set(session.id, {
          session,
          speaker: {
            name,
            role,
            imageUrl: speaker.profile_image_url,
            slug: speaker.slug,
          },
        });
      }
    }
  }

  return sessionMap;
}

export async function getPublicScheduleRows() {
  const supabase = createProgramServiceClient();
  const { data, error } = await supabase
    .from('program_schedule_items')
    .select(`
      *,
      program_session:program_sessions(
        id,
        cfp_submission_id,
        kind,
        title,
        abstract,
        level,
        status,
        metadata,
        speakers:program_session_speakers(
          speaker_id,
          role,
          sort_order,
          speaker:cfp_speakers(
            id,
            first_name,
            last_name,
            job_title,
            company,
            profile_image_url
          )
        )
      )
    `)
    .eq('is_visible', true)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[Program Schedule] Failed to fetch public schedule rows:', error.message);
    return [];
  }

  return (data || []) as ProgramScheduleItemRecord[];
}

export async function getAdminScheduleRows() {
  const supabase = createProgramServiceClient();
  const { data, error } = await supabase
    .from('program_schedule_items')
    .select(`
      *,
      program_session:program_sessions(
        id,
        cfp_submission_id,
        kind,
        title,
        abstract,
        level,
        status,
        metadata,
        speakers:program_session_speakers(
          speaker_id,
          role,
          sort_order,
          speaker:cfp_speakers(
            id,
            first_name,
            last_name,
            job_title,
            company,
            profile_image_url
          )
        )
      )
    `)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[Program Schedule] Failed to fetch admin schedule rows:', error.message);
    return [];
  }

  return (data || []) as ProgramScheduleItemRecord[];
}

export async function getPublicScheduleRowMapBySubmissionId() {
  const rows = await getPublicScheduleRows();
  const rowMap = new Map<string, ProgramScheduleItemRecord>();

  for (const row of rows) {
    if (!row.submission_id) {
      continue;
    }

    if (!rowMap.has(row.submission_id)) {
      rowMap.set(row.submission_id, row);
    }
  }

  return rowMap;
}

export function buildPublicProgramScheduleItems(rows: ProgramScheduleItemRecord[], speakers: PublicSpeaker[]) {
  const sessionMap = buildPublicSpeakerSessionMap(speakers);
  const speakerById = new Map(speakers.map((speaker) => [speaker.id, speaker]));
  const sessionSlugCounts = new Map<string, number>();

  const slugify = (value: string, fallback: string) => {
    const base = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback;
    const count = sessionSlugCounts.get(base) ?? 0;
    sessionSlugCounts.set(base, count + 1);
    return count === 0 ? base : `${base}-${fallback.split('-')[0]}`;
  };

  return rows.map((row): PublicProgramScheduleItem => {
    const programSession = row.session_id ? row.program_session ?? null : null;
    const programSpeakers: PublicSessionSpeaker[] = (programSession?.speakers ?? [])
      .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
      .reduce<PublicSessionSpeaker[]>((acc, assignment) => {
        const publicSpeaker = speakerById.get(assignment.speaker_id);
        if (publicSpeaker) {
          acc.push({
            name: [publicSpeaker.first_name, publicSpeaker.last_name].filter(Boolean).join(' '),
            role: [publicSpeaker.job_title, publicSpeaker.company].filter(Boolean).join(' @ ') || null,
            imageUrl: publicSpeaker.profile_image_url,
            slug: publicSpeaker.slug,
            participantRole: assignment.role ?? null,
          });
          return acc;
        }

        const speaker = assignment.speaker;
        if (!speaker) return acc;

        acc.push({
          name: [speaker.first_name, speaker.last_name].filter(Boolean).join(' '),
          role: [speaker.job_title, speaker.company].filter(Boolean).join(' @ ') || null,
          imageUrl: speaker.profile_image_url,
          slug: null,
          participantRole: assignment.role ?? null,
        });
        return acc;
      }, []);
    const legacyType = typeof programSession?.metadata?.legacy_submission_type === 'string'
      ? programSession.metadata.legacy_submission_type
      : null;
    const programSessionType =
      programSession?.kind === 'workshop'
        ? 'workshop'
        : programSession?.kind === 'panel'
          ? 'panel'
          : legacyType === 'lightning'
            ? 'lightning'
            : 'standard';
    const builtProgramSession = programSession
      ? {
          session: {
            id: programSession.id,
            cfp_submission_id: programSession.cfp_submission_id,
            slug: slugify(programSession.title, programSession.id),
            title: programSession.title,
            abstract: programSession.abstract ?? row.description ?? '',
            tags: Array.isArray(programSession.metadata?.tags)
              ? programSession.metadata.tags.filter((tag): tag is string => typeof tag === 'string')
              : [],
            type: programSessionType as PublicSession['type'],
            level: programSession.level ?? 'intermediate',
            speakers: programSpeakers,
            schedule: {
              date: row.date,
              start_time: row.start_time,
              duration_minutes: row.duration_minutes,
              room: row.room,
            },
          },
          speaker: programSpeakers[0] ?? null,
        }
      : null;
    const linkedSession = builtProgramSession ?? (row.submission_id ? sessionMap.get(row.submission_id) ?? null : null);
    const sessionKind = linkedSession
      ? linkedSession.session.type === 'panel'
        ? 'panel'
        : linkedSession.session.type === 'workshop'
        ? 'workshop'
        : 'talk'
      : null;

    return {
      ...row,
      session: linkedSession?.session ?? null,
      speaker: linkedSession?.speaker ?? null,
      speakers: linkedSession?.session.speakers ?? (linkedSession?.speaker ? [linkedSession.speaker] : []),
      session_kind: sessionKind,
    };
  });
}

export async function createProgramScheduleItem(input: ProgramScheduleItemInput) {
  if (input.type === 'session' && !input.session_id && input.is_visible) {
    return { item: null, error: 'Session placeholders cannot be publicly visible until a session is selected' };
  }

  const supabase = createProgramServiceClient();
  const { data, error } = await supabase
    .from('program_schedule_items')
    .insert({
      date: input.date,
      start_time: input.start_time,
      duration_minutes: input.duration_minutes,
      room: input.room ?? null,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      session_id: input.session_id ?? null,
      submission_id: input.submission_id ?? (await resolveScheduleSubmissionId(input)),
      is_visible: input.is_visible ?? false,
    })
    .select('*')
    .single();

  if (error) {
    return { item: null, error: error.message };
  }

  const linkedSubmissionId = data.submission_id ?? await resolveScheduleSubmissionId(input);

  if (linkedSubmissionId) {
    const syncResult = await syncSubmissionScheduleFields(linkedSubmissionId, {
      date: input.date,
      start_time: input.start_time,
      duration_minutes: input.duration_minutes,
      room: input.room ?? null,
    });

    if (!syncResult.success) {
      return { item: null, error: syncResult.error };
    }
  }

  return { item: data as ProgramScheduleItemRecord };
}

export async function updateProgramScheduleItem(id: string, input: Partial<ProgramScheduleItemInput>) {
  const supabase = createProgramServiceClient();
  const { data: existingItem, error: existingItemError } = await supabase
    .from('program_schedule_items')
    .select('*')
    .eq('id', id)
    .single();

  if (existingItemError || !existingItem) {
    return { item: null, error: existingItemError?.message || 'Failed to load existing schedule item' };
  }

  const resolvedSessionId =
    input.session_id !== undefined ? input.session_id : existingItem.session_id ?? null;
  const resolvedSubmissionId =
    input.submission_id !== undefined
      ? input.submission_id
      : input.session_id !== undefined
        ? await getSubmissionIdForSession(input.session_id)
        : existingItem.submission_id ?? null;
  const resolvedType =
    input.type !== undefined ? input.type : existingItem.type;
  const resolvedVisibility =
    input.is_visible !== undefined ? input.is_visible : existingItem.is_visible;

  if (resolvedType === 'session' && !resolvedSessionId && resolvedVisibility) {
    return { item: null, error: 'Session placeholders cannot be publicly visible until a session is selected' };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.date !== undefined) updates.date = input.date;
  if (input.start_time !== undefined) updates.start_time = input.start_time;
  if (input.duration_minutes !== undefined) updates.duration_minutes = input.duration_minutes;
  if (input.room !== undefined) updates.room = input.room;
  if (input.type !== undefined) updates.type = input.type;
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.session_id !== undefined) updates.session_id = resolvedSessionId;
  if (input.submission_id !== undefined || input.session_id !== undefined) {
    updates.submission_id = resolvedSubmissionId;
  }
  if (input.is_visible !== undefined) updates.is_visible = input.is_visible;

  const { data, error } = await supabase
    .from('program_schedule_items')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { item: null, error: error.message };
  }

  const existingSubmissionId = existingItem.submission_id ?? await getSubmissionIdForSession(existingItem.session_id);
  const nextSubmissionId = data.submission_id ?? await getSubmissionIdForSession(data.session_id);

  if (existingSubmissionId && existingSubmissionId !== nextSubmissionId) {
    const clearResult = await syncSubmissionScheduleFields(existingSubmissionId, null);
    if (!clearResult.success) {
      return { item: null, error: clearResult.error };
    }
  }

  if (nextSubmissionId) {
    const syncResult = await syncSubmissionScheduleFields(nextSubmissionId, {
      date: data.date,
      start_time: data.start_time,
      duration_minutes: data.duration_minutes,
      room: data.room,
    });

    if (!syncResult.success) {
      return { item: null, error: syncResult.error };
    }
  }

  return { item: data as ProgramScheduleItemRecord };
}

export async function deleteProgramScheduleItem(id: string) {
  const supabase = createProgramServiceClient();
  const { data: existingItem, error: existingItemError } = await supabase
    .from('program_schedule_items')
    .select('submission_id, session_id')
    .eq('id', id)
    .single();

  if (existingItemError || !existingItem) {
    return { success: false, error: existingItemError?.message || 'Failed to load schedule item' };
  }

  const { error } = await supabase
    .from('program_schedule_items')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  const linkedSubmissionId = existingItem.submission_id ?? await getSubmissionIdForSession(existingItem.session_id);

  if (linkedSubmissionId) {
    const clearResult = await syncSubmissionScheduleFields(linkedSubmissionId, null);
    if (!clearResult.success) {
      return { success: false, error: clearResult.error };
    }
  }

  return { success: true };
}
