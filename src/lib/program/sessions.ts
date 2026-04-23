import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import type {
  ProgramSession,
  ProgramSessionInput,
  ProgramSessionKind,
  ProgramSessionSpeakerInput,
  ProgramSessionSpeakerRole,
  ProgramSessionStatus,
  ProgramSessionUpdateInput,
} from '@/lib/types/program';

function createProgramClient() {
  return createClient(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

interface CfpSubmissionSource {
  id: string;
  speaker_id: string;
  title: string;
  abstract: string;
  submission_type: string;
  talk_level: 'beginner' | 'intermediate' | 'advanced' | null;
  status: string;
  workshop_duration_hours: number | null;
  workshop_max_participants: number | null;
  metadata: Record<string, unknown> | null;
}

interface SubmissionTagRow {
  tag?: {
    name?: string | null;
  } | null;
}

function submissionTypeToSessionKind(submissionType: string): ProgramSessionKind {
  if (submissionType === 'workshop') return 'workshop';
  if (submissionType === 'panel') return 'panel';
  return 'talk';
}

function cleanSessionInput(input: ProgramSessionInput | ProgramSessionUpdateInput) {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (key === 'speakers') continue;
    if (value !== undefined) output[key] = value;
  }

  return output;
}

function normalizeTagNames(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
}

async function getSubmissionTagNames(supabase: ReturnType<typeof createProgramClient>, submissionId: string) {
  const { data, error } = await supabase
    .from('cfp_submission_tags')
    .select('tag:cfp_tags(name)')
    .eq('submission_id', submissionId);

  if (error) {
    return { tags: [] as string[], error: error.message };
  }

  const tags = ((data || []) as SubmissionTagRow[])
    .map((row) => row.tag?.name ?? null)
    .filter((tag): tag is string => Boolean(tag));

  return { tags: normalizeTagNames(tags) };
}

async function syncSessionTagsFromSubmission(
  supabase: ReturnType<typeof createProgramClient>,
  sessionId: string,
  submissionId: string
) {
  const sessionResult = await getProgramSession(sessionId);
  if (sessionResult.error || !sessionResult.session) return sessionResult;

  const submissionTagsResult = await getSubmissionTagNames(supabase, submissionId);
  if (submissionTagsResult.error) {
    return { session: null, error: submissionTagsResult.error };
  }

  const existingTags = Array.isArray(sessionResult.session.metadata?.tags)
    ? sessionResult.session.metadata.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];
  const mergedTags = normalizeTagNames([...existingTags, ...submissionTagsResult.tags]);

  if (mergedTags.length === existingTags.length && mergedTags.every((tag, index) => tag === existingTags[index])) {
    return sessionResult;
  }

  return updateProgramSession(sessionId, {
    metadata: {
      ...sessionResult.session.metadata,
      tags: mergedTags,
    },
  });
}

export async function listProgramSessions(options: {
  status?: ProgramSessionStatus | ProgramSessionStatus[];
  kind?: ProgramSessionKind | ProgramSessionKind[];
  includeArchived?: boolean;
} = {}): Promise<{ sessions: ProgramSession[]; error?: string }> {
  const supabase = createProgramClient();
  let query = supabase
    .from('program_sessions')
    .select(`
      *,
      speakers:program_session_speakers(
        session_id,
        speaker_id,
        role,
        sort_order,
        created_at,
        speaker:cfp_speakers(
          id,
          first_name,
          last_name,
          email,
          job_title,
          company,
          profile_image_url,
          speaker_role
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (options.status) {
    query = Array.isArray(options.status)
      ? query.in('status', options.status)
      : query.eq('status', options.status);
  } else if (!options.includeArchived) {
    query = query.neq('status', 'archived');
  }

  if (options.kind) {
    query = Array.isArray(options.kind)
      ? query.in('kind', options.kind)
      : query.eq('kind', options.kind);
  }

  const { data, error } = await query;
  if (error) return { sessions: [], error: error.message };

  return { sessions: (data || []) as ProgramSession[] };
}

export async function getProgramSession(id: string): Promise<{ session: ProgramSession | null; error?: string }> {
  const supabase = createProgramClient();
  const { data, error } = await supabase
    .from('program_sessions')
    .select(`
      *,
      speakers:program_session_speakers(
        session_id,
        speaker_id,
        role,
        sort_order,
        created_at,
        speaker:cfp_speakers(
          id,
          first_name,
          last_name,
          email,
          job_title,
          company,
          profile_image_url,
          speaker_role
        )
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) return { session: null, error: error.message };
  return { session: (data as ProgramSession | null) ?? null };
}

export async function createProgramSession(
  input: ProgramSessionInput
): Promise<{ session: ProgramSession | null; error?: string }> {
  const supabase = createProgramClient();
  const { speakers = [], ...sessionInput } = input;

  const { data, error } = await supabase
    .from('program_sessions')
    .insert({
      ...cleanSessionInput(sessionInput),
      status: input.status ?? 'draft',
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single();

  if (error || !data) return { session: null, error: error?.message ?? 'Failed to create session' };

  if (speakers.length > 0) {
    const assignment = await replaceProgramSessionSpeakers(data.id, speakers);
    if (assignment.error) return { session: null, error: assignment.error };
  }

  return getProgramSession(data.id);
}

export async function updateProgramSession(
  id: string,
  input: ProgramSessionUpdateInput
): Promise<{ session: ProgramSession | null; error?: string }> {
  const supabase = createProgramClient();
  const updates = cleanSessionInput(input);

  if (Object.keys(updates).length === 0) {
    return getProgramSession(id);
  }

  const { data, error } = await supabase
    .from('program_sessions')
    .update(updates)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return { session: null, error: error.message };
  if (!data) return { session: null, error: 'Session not found' };

  return getProgramSession(id);
}

export async function archiveProgramSession(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createProgramClient();
  const { error } = await supabase
    .from('program_sessions')
    .update({ status: 'archived' })
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function replaceProgramSessionSpeakers(
  sessionId: string,
  speakers: ProgramSessionSpeakerInput[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createProgramClient();
  const normalized = speakers
    .filter((speaker, index, list) =>
      Boolean(speaker.speaker_id) &&
      list.findIndex((candidate) => candidate.speaker_id === speaker.speaker_id) === index
    )
    .map((speaker, index) => ({
      session_id: sessionId,
      speaker_id: speaker.speaker_id,
      role: speaker.role ?? 'speaker',
      sort_order: speaker.sort_order ?? index,
    }));

  const { error: deleteError } = await supabase
    .from('program_session_speakers')
    .delete()
    .eq('session_id', sessionId);

  if (deleteError) return { success: false, error: deleteError.message };
  if (normalized.length === 0) return { success: true };

  const { error: insertError } = await supabase
    .from('program_session_speakers')
    .insert(normalized);

  if (insertError) return { success: false, error: insertError.message };
  return { success: true };
}

export async function promoteCfpSubmissionToProgramSession(
  submissionId: string,
  status: ProgramSessionStatus = 'confirmed'
): Promise<{ session: ProgramSession | null; error?: string }> {
  const supabase = createProgramClient();
  const { data: existing, error: existingError } = await supabase
    .from('program_sessions')
    .select('id')
    .eq('cfp_submission_id', submissionId)
    .maybeSingle();

  if (existingError) return { session: null, error: existingError.message };
  if (existing?.id) {
    return syncSessionTagsFromSubmission(supabase, existing.id, submissionId);
  }

  const { data: submission, error: submissionError } = await supabase
    .from('cfp_submissions')
    .select(`
      id,
      speaker_id,
      title,
      abstract,
      submission_type,
      talk_level,
      status,
      workshop_duration_hours,
      workshop_max_participants,
      metadata
    `)
    .eq('id', submissionId)
    .maybeSingle();

  if (submissionError) return { session: null, error: submissionError.message };
  if (!submission) return { session: null, error: 'CFP submission not found' };
  if (submission.status !== 'accepted') {
    return { session: null, error: 'Only accepted submissions can be promoted' };
  }

  const source = submission as CfpSubmissionSource;
  const submissionTagsResult = await getSubmissionTagNames(supabase, submissionId);
  if (submissionTagsResult.error) {
    return { session: null, error: submissionTagsResult.error };
  }

  const sessionResult = await createProgramSession({
    cfp_submission_id: source.id,
    kind: submissionTypeToSessionKind(source.submission_type),
    title: source.title,
    abstract: source.abstract,
    level: source.talk_level,
    status,
    workshop_duration_minutes: source.workshop_duration_hours
      ? Math.round(source.workshop_duration_hours * 60)
      : null,
    workshop_capacity: source.workshop_max_participants,
    metadata: {
      ...(source.metadata ?? {}),
      tags: normalizeTagNames([
        ...(Array.isArray(source.metadata?.tags)
          ? source.metadata.tags.filter((tag): tag is string => typeof tag === 'string')
          : []),
        ...submissionTagsResult.tags,
      ]),
      source: 'cfp_submission',
      promoted_at: new Date().toISOString(),
    },
    speakers: [{
      speaker_id: source.speaker_id,
      role: source.submission_type === 'workshop' ? 'instructor' : 'speaker',
      sort_order: 0,
    }],
  });

  if (sessionResult.error || !sessionResult.session) return sessionResult;

  const { data: participantRows, error: participantError } = await supabase
    .from('cfp_submission_speakers')
    .select('speaker_id, role')
    .eq('submission_id', submissionId);

  if (participantError) return { session: null, error: participantError.message };

  const participantSpeakers: ProgramSessionSpeakerInput[] = (participantRows || [])
    .filter((row: { speaker_id: string }) => row.speaker_id !== source.speaker_id)
    .map((row: { speaker_id: string; role: string | null }, index: number) => ({
      speaker_id: row.speaker_id,
      role: row.role === 'host' || row.role === 'mc' || row.role === 'instructor'
        ? row.role as ProgramSessionSpeakerRole
        : source.submission_type === 'workshop'
          ? 'instructor'
          : 'panelist',
      sort_order: index + 1,
    }));

  if (participantSpeakers.length > 0) {
    const assignment = await replaceProgramSessionSpeakers(sessionResult.session.id, [
      {
        speaker_id: source.speaker_id,
        role: source.submission_type === 'workshop' ? 'instructor' : 'speaker',
        sort_order: 0,
      },
      ...participantSpeakers,
    ]);
    if (assignment.error) return { session: null, error: assignment.error };
  }

  await supabase
    .from('program_schedule_items')
    .update({ session_id: sessionResult.session.id })
    .eq('submission_id', submissionId)
    .is('session_id', null);

  await supabase
    .from('workshops')
    .update({ session_id: sessionResult.session.id })
    .eq('cfp_submission_id', submissionId)
    .is('session_id', null);

  return getProgramSession(sessionResult.session.id);
}
