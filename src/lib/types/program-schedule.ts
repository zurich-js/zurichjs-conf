import type { PublicSession, PublicSpeaker } from '@/lib/types/cfp';

export type ProgramScheduleItemType = 'session' | 'event' | 'break' | 'placeholder';

export interface ProgramScheduleItemRecord {
  id: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  room: string | null;
  type: ProgramScheduleItemType;
  title: string;
  description: string | null;
  session_id?: string | null;
  submission_id: string | null;
  is_visible: boolean;
  created_at?: string;
  updated_at?: string;
  program_session?: {
    id: string;
    cfp_submission_id: string | null;
    kind: 'talk' | 'workshop' | 'panel' | 'keynote' | 'event';
    title: string;
    abstract: string | null;
    level: 'beginner' | 'intermediate' | 'advanced' | null;
    status: 'draft' | 'confirmed' | 'published' | 'archived';
    metadata: Record<string, unknown> | null;
    speakers?: Array<{
      speaker_id: string;
      role: string | null;
      sort_order: number | null;
      speaker?: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        job_title: string | null;
        company: string | null;
        profile_image_url: string | null;
      } | null;
    }>;
  } | null;
}

export interface ProgramScheduleSpeakerPreview {
  name: string;
  role: string | null;
  imageUrl: string | null;
  slug: string | null;
  participantRole?: string | null;
}

export interface PublicProgramScheduleItem extends ProgramScheduleItemRecord {
  session: PublicSession | null;
  speaker: ProgramScheduleSpeakerPreview | null;
  speakers: ProgramScheduleSpeakerPreview[];
  session_kind: 'talk' | 'workshop' | 'panel' | null;
}

export interface ProgramScheduleItemInput {
  date: string;
  start_time: string;
  duration_minutes: number;
  room?: string | null;
  type: ProgramScheduleItemType;
  title: string;
  description?: string | null;
  session_id?: string | null;
  submission_id?: string | null;
  is_visible?: boolean;
}

export interface PublicSpeakerSessionMapEntry {
  session: PublicSession;
  speaker: ProgramScheduleSpeakerPreview;
}

export type PublicSpeakerWithSessions = PublicSpeaker;
