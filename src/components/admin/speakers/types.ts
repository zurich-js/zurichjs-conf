/**
 * Speakers Dashboard Types
 * Types for the confirmed speakers management
 */

export interface Speaker {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  company: string | null;
  bio: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  twitter_handle: string | null;
  bluesky_handle: string | null;
  mastodon_handle: string | null;
  profile_image_url: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  title: string;
  status: string;
  submission_type: string;
  talk_level: string;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_duration_minutes: number | null;
  room: string | null;
}

export interface SpeakerWithSessions extends Speaker {
  submissions: Session[];
}
