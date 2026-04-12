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
  submission_id: string | null;
  is_visible: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProgramScheduleSpeakerPreview {
  name: string;
  role: string;
  imageUrl: string | null;
  slug: string;
}

export interface PublicProgramScheduleItem extends ProgramScheduleItemRecord {
  session: PublicSession | null;
  speaker: ProgramScheduleSpeakerPreview | null;
  session_kind: 'talk' | 'workshop' | null;
}

export interface ProgramScheduleItemInput {
  date: string;
  start_time: string;
  duration_minutes: number;
  room?: string | null;
  type: ProgramScheduleItemType;
  title: string;
  description?: string | null;
  submission_id?: string | null;
  is_visible?: boolean;
}

export interface PublicSpeakerSessionMapEntry {
  session: PublicSession;
  speaker: ProgramScheduleSpeakerPreview;
}

export type PublicSpeakerWithSessions = PublicSpeaker;
