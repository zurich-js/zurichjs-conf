/**
 * CFP Public Types
 * Types for public-facing speaker and session display
 */

import type { CfpSpeakerRole, CfpSubmissionType, CfpTalkLevel } from './base';

export interface PublicSessionSpeaker {
  name: string;
  role: string | null;
  imageUrl: string | null;
  slug: string;
  participantRole?: string | null;
}

/**
 * Session information for public display
 */
export interface PublicSession {
  id: string;
  slug: string;
  title: string;
  abstract: string;
  tags: string[];
  type: CfpSubmissionType;
  level: CfpTalkLevel;
  speakers: PublicSessionSpeaker[];
  schedule: {
    date: string | null;
    start_time: string | null;
    duration_minutes: number | null;
    room: string | null;
  } | null;
}

/**
 * Speaker information for public lineup display
 * Contains only publicly safe information
 */
export interface PublicSpeaker {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  company: string | null;
  bio: string | null;
  profile_image_url: string | null;
  header_image_url: string | null;
  portrait_foreground_url: string | null;
  portrait_background_url: string | null;
  is_featured: boolean;
  speaker_role: CfpSpeakerRole;
  tags: string[];
  socials: {
    linkedin_url: string | null;
    github_url: string | null;
    twitter_handle: string | null;
    bluesky_handle: string | null;
    mastodon_handle: string | null;
  };
  assigned_session_kinds: {
    talks: boolean;
    workshops: boolean;
  };
  sessions: PublicSession[];
}
