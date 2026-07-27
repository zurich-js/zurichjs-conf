/**
 * Speaker Logistics Types
 * Event RSVPs + logistics details collected from speakers via their unique
 * token link (cfp_speaker_logistics table)
 */

import type { Database } from '@/lib/types/database';

export type SpeakerLogisticsRow = Database['public']['Tables']['cfp_speaker_logistics']['Row'];
export type SpeakerLogisticsInsert = Database['public']['Tables']['cfp_speaker_logistics']['Insert'];
export type SpeakerLogisticsUpdate = Database['public']['Tables']['cfp_speaker_logistics']['Update'];

/** The RSVP answer fields on a logistics row */
export const SPEAKER_LOGISTICS_ATTENDANCE_FIELDS = [
  'attending_warmup',
  'attending_speakers_dinner',
  'attending_after_party',
  'attending_speaker_hangout',
] as const;

export type SpeakerLogisticsAttendanceField = (typeof SPEAKER_LOGISTICS_ATTENDANCE_FIELDS)[number];

/** The answers a speaker can edit through the logistics form */
export interface SpeakerLogisticsAnswers {
  attending_warmup: boolean | null;
  attending_speakers_dinner: boolean | null;
  attending_after_party: boolean | null;
  attending_speaker_hangout: boolean | null;
  dietary_restrictions: string | null;
  dinner_plus_one: boolean | null;
  dinner_plus_one_dietary_restrictions: string | null;
  after_party_plus_one: boolean | null;
  after_party_plus_one_first_name: string | null;
  after_party_plus_one_last_name: string | null;
  after_party_plus_one_email: string | null;
  talk_special_accommodations: string | null;
}
