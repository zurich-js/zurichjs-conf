/**
 * Speaker Logistics Types
 * Event RSVPs + logistics details collected from speakers via their unique
 * token link (cfp_speaker_logistics table)
 */

import type { Database } from '@/lib/types/database';

export type SpeakerLogisticsRow = Database['public']['Tables']['cfp_speaker_logistics']['Row'];
export type SpeakerLogisticsInsert = Database['public']['Tables']['cfp_speaker_logistics']['Insert'];
export type SpeakerLogisticsUpdate = Database['public']['Tables']['cfp_speaker_logistics']['Update'];

export type ActivityGuestRow = Database['public']['Tables']['speaker_activity_guests']['Row'];
export type ActivityGuestInsert = Database['public']['Tables']['speaker_activity_guests']['Insert'];
export type ActivityGuestUpdate = Database['public']['Tables']['speaker_activity_guests']['Update'];

/** How an additional activity guest got their seat */
export const ACTIVITY_GUEST_TYPES = ['speaker_plus_one', 'volunteer', 'complimentary', 'paid'] as const;
export type ActivityGuestType = (typeof ACTIVITY_GUEST_TYPES)[number];

export const ACTIVITY_GUEST_TYPE_LABELS: Record<ActivityGuestType, string> = {
  speaker_plus_one: 'Speaker plus one',
  volunteer: 'Volunteer',
  complimentary: 'Complimentary',
  paid: 'Paid',
};

/** The answers a speaker submits through the logistics form */
export interface SpeakerLogisticsAnswers {
  attending_warmup: boolean | null;
  attending_speakers_dinner: boolean | null;
  attending_after_party: boolean | null;
  attending_speaker_hangout: boolean | null;
  speaker_hangout_plus_one: boolean | null;
  dietary_restrictions: string | null;
  dinner_plus_one: boolean | null;
  dinner_plus_one_dietary_restrictions: string | null;
  after_party_plus_one: boolean | null;
  after_party_plus_one_first_name: string | null;
  after_party_plus_one_last_name: string | null;
  after_party_plus_one_email: string | null;
  talk_special_accommodations: string | null;
}
