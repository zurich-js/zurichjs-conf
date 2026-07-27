/**
 * Speaker Logistics Form Types (public, token-authenticated page)
 */

import type {
  SpeakerLogisticsFormResponse,
  SpeakerLogisticsSpeakerInfo,
} from '@/pages/api/speaker-logistics/[token]';

export type { SpeakerLogisticsFormResponse, SpeakerLogisticsSpeakerInfo };

/** Local form state — strings stay strings until submit for easy inputs */
export interface LogisticsFormState {
  attending_warmup: boolean | null;
  attending_speakers_dinner: boolean | null;
  attending_after_party: boolean | null;
  attending_speaker_hangout: boolean | null;
  dietary_restrictions: string;
  dinner_plus_one: boolean;
  dinner_plus_one_dietary_restrictions: string;
  after_party_plus_one: boolean;
  after_party_plus_one_first_name: string;
  after_party_plus_one_last_name: string;
  after_party_plus_one_email: string;
  talk_special_accommodations: string;
  tshirt_size: string;
}

export const EMPTY_LOGISTICS_FORM_STATE: LogisticsFormState = {
  attending_warmup: null,
  attending_speakers_dinner: null,
  attending_after_party: null,
  attending_speaker_hangout: null,
  dietary_restrictions: '',
  dinner_plus_one: false,
  dinner_plus_one_dietary_restrictions: '',
  after_party_plus_one: false,
  after_party_plus_one_first_name: '',
  after_party_plus_one_last_name: '',
  after_party_plus_one_email: '',
  talk_special_accommodations: '',
  tshirt_size: '',
};

/** Seed the form from previously saved answers */
export function formStateFromResponse(response: SpeakerLogisticsFormResponse): LogisticsFormState {
  const answers = response.logistics;
  return {
    attending_warmup: answers?.attending_warmup ?? null,
    attending_speakers_dinner: answers?.attending_speakers_dinner ?? null,
    attending_after_party: answers?.attending_after_party ?? null,
    attending_speaker_hangout: answers?.attending_speaker_hangout ?? null,
    dietary_restrictions: answers?.dietary_restrictions ?? '',
    dinner_plus_one: answers?.dinner_plus_one ?? false,
    dinner_plus_one_dietary_restrictions: answers?.dinner_plus_one_dietary_restrictions ?? '',
    after_party_plus_one: answers?.after_party_plus_one ?? false,
    after_party_plus_one_first_name: answers?.after_party_plus_one_first_name ?? '',
    after_party_plus_one_last_name: answers?.after_party_plus_one_last_name ?? '',
    after_party_plus_one_email: answers?.after_party_plus_one_email ?? '',
    talk_special_accommodations: answers?.talk_special_accommodations ?? '',
    tshirt_size: response.speaker.tshirtSize ?? '',
  };
}
