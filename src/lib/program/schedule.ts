import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import type { PublicSpeaker } from '@/lib/types/cfp';
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

function buildPublicSpeakerSessionMap(speakers: PublicSpeaker[]) {
  const sessionMap = new Map<string, PublicSpeakerSessionMapEntry>();

  for (const speaker of speakers) {
    const name = [speaker.first_name, speaker.last_name].filter(Boolean).join(' ');
    const role = [speaker.job_title, speaker.company].filter(Boolean).join(' @ ');

    for (const session of speaker.sessions) {
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

  return sessionMap;
}

export async function getPublicScheduleRows() {
  const supabase = createProgramServiceClient();
  const { data, error } = await supabase
    .from('program_schedule_items')
    .select('*')
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
    .select('*')
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

  return rows.map((row): PublicProgramScheduleItem => {
    const linkedSession = row.submission_id ? sessionMap.get(row.submission_id) ?? null : null;
    const sessionKind = linkedSession
      ? linkedSession.session.type === 'workshop'
        ? 'workshop'
        : 'talk'
      : null;

    return {
      ...row,
      session: linkedSession?.session ?? null,
      speaker: linkedSession?.speaker ?? null,
      session_kind: sessionKind,
    };
  });
}

export async function createProgramScheduleItem(input: ProgramScheduleItemInput) {
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
      submission_id: input.submission_id ?? null,
      is_visible: input.is_visible ?? true,
    })
    .select('*')
    .single();

  if (error) {
    return { item: null, error: error.message };
  }

  if (input.submission_id) {
    const syncResult = await syncSubmissionScheduleFields(input.submission_id, {
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

  const { data, error } = await supabase
    .from('program_schedule_items')
    .update({
      date: input.date,
      start_time: input.start_time,
      duration_minutes: input.duration_minutes,
      room: input.room,
      type: input.type,
      title: input.title,
      description: input.description,
      submission_id: input.submission_id,
      is_visible: input.is_visible,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { item: null, error: error.message };
  }

  if (existingItem.submission_id && existingItem.submission_id !== data.submission_id) {
    const clearResult = await syncSubmissionScheduleFields(existingItem.submission_id, null);
    if (!clearResult.success) {
      return { item: null, error: clearResult.error };
    }
  }

  if (data.submission_id) {
    const syncResult = await syncSubmissionScheduleFields(data.submission_id, {
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
    .select('submission_id')
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

  if (existingItem.submission_id) {
    const clearResult = await syncSubmissionScheduleFields(existingItem.submission_id, null);
    if (!clearResult.success) {
      return { success: false, error: clearResult.error };
    }
  }

  return { success: true };
}
