/**
 * Edit Submission Form Types and Constants
 */

import type { CfpSubmissionType, CfpTalkLevel } from '@/lib/types/cfp';

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
  workshop_duration_hours: number;
  workshop_expected_compensation: string;
  workshop_special_requirements: string;
  workshop_max_participants: number;
}

export const TYPE_INFO: Record<CfpSubmissionType, { title: string; duration: string; description: string }> = {
  lightning: {
    title: 'Lightning Talk',
    duration: '15 minutes',
    description: 'Quick, focused presentations that pack a punch.',
  },
  standard: {
    title: 'Standard Talk',
    duration: '30 minutes',
    description: 'The classic conference talk format.',
  },
  workshop: {
    title: 'Workshop',
    duration: '2-8 hours',
    description: 'Hands-on sessions where attendees learn by doing.',
  },
};

export const LEVEL_INFO: Record<CfpTalkLevel, string> = {
  beginner: 'Suitable for developers new to the topic',
  intermediate: 'Assumes some familiarity with the topic',
  advanced: 'For developers with significant experience',
};
