/**
 * CFP Public Types
 * Types for public-facing speaker and session display
 */

import type { CfpSubmissionType, CfpTalkLevel } from './base';

/**
 * Session information for public display
 */
export interface PublicSession {
  id: string;
  title: string;
  abstract: string;
  type: CfpSubmissionType;
  level: CfpTalkLevel;
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
  first_name: string;
  last_name: string;
  job_title: string | null;
  company: string | null;
  bio: string | null;
  profile_image_url: string | null;
  is_featured: boolean;
  socials: {
    linkedin_url: string | null;
    github_url: string | null;
    twitter_handle: string | null;
    bluesky_handle: string | null;
    mastodon_handle: string | null;
  };
  sessions: PublicSession[];
}
