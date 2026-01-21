/**
 * CFP Profile - Shared types
 */

import type { SpeakerProfileFormData } from '@/lib/validations/cfp';

export type TravelOption = 'employer_covers' | 'self_managed' | 'need_assistance';

export interface ProfileFormProps {
  formData: SpeakerProfileFormData;
  errors: Record<string, string>;
  handleChange: (field: keyof SpeakerProfileFormData, value: string | boolean | null) => void;
}
