/**
 * Submit Wizard Types and Constants
 */

import type { CfpSubmissionType, CfpTalkLevel } from '@/lib/types/cfp';

export type WizardStep = 'type' | 'details' | 'logistics' | 'review';

export interface FormData {
  submission_type: CfpSubmissionType;
  title: string;
  abstract: string;
  talk_level: CfpTalkLevel;
  tags: string[];
  outline: string;
  additional_notes: string;
  slides_url: string;
  previous_recording_url: string;
  travel_assistance_required: boolean;
  travel_origin: string;
  company_can_cover_travel: boolean;
  special_requirements: string;
  // Workshop-specific
  workshop_duration_hours: number;
  workshop_expected_compensation: string;
  workshop_special_requirements: string;
  workshop_max_participants: number;
}

export const INITIAL_FORM_DATA: FormData = {
  submission_type: 'standard',
  title: '',
  abstract: '',
  talk_level: 'intermediate',
  tags: [],
  outline: '',
  additional_notes: '',
  slides_url: '',
  previous_recording_url: '',
  travel_assistance_required: false,
  travel_origin: '',
  company_can_cover_travel: false,
  special_requirements: '',
  workshop_duration_hours: 4,
  workshop_expected_compensation: '',
  workshop_special_requirements: '',
  workshop_max_participants: 30,
};

export const TYPE_INFO = {
  lightning: {
    title: 'Lightning Talk',
    duration: '15 minutes',
    description: 'Quick, focused presentations that pack a punch. Great for introducing a concept or sharing a quick tip.',
  },
  standard: {
    title: 'Standard Talk',
    duration: '30 minutes',
    description: 'The classic conference talk format. Dive deep into a topic with time for context, examples, and takeaways.',
  },
  workshop: {
    title: 'Workshop',
    duration: '2-8 hours',
    description: 'Hands-on sessions where attendees learn by doing. Interactive coding exercises and real-world projects.',
  },
} as const;

export const LEVEL_INFO = {
  beginner: 'Suitable for developers new to the topic',
  intermediate: 'Assumes some familiarity with the topic',
  advanced: 'For developers with significant experience',
} as const;
