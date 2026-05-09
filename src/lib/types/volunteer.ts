/**
 * Volunteer System Types
 * Types and enums for volunteer roles, applications, and profiles
 */

// ============================================
// STATUS & ENUM TYPES
// ============================================

export type VolunteerRoleStatus = 'draft' | 'published' | 'closed' | 'archived';

export type VolunteerCommitmentType =
  | 'workshop_day'
  | 'conference_day'
  | 'both_days'
  | 'pre_event'
  | 'remote'
  | 'flexible';

export type VolunteerApplicationStatus =
  | 'submitted'
  | 'in_review'
  | 'shortlisted'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export type VolunteerProfileStatus =
  | 'pending_confirmation'
  | 'confirmed'
  | 'active'
  | 'cancelled'
  | 'completed';

// Const arrays for Zod enum usage and iteration
export const VOLUNTEER_ROLE_STATUSES = [
  'draft',
  'published',
  'closed',
  'archived',
] as const;

export const VOLUNTEER_COMMITMENT_TYPES = [
  'workshop_day',
  'conference_day',
  'both_days',
  'pre_event',
  'remote',
  'flexible',
] as const;

export const VOLUNTEER_APPLICATION_STATUSES = [
  'submitted',
  'in_review',
  'shortlisted',
  'accepted',
  'rejected',
  'withdrawn',
] as const;

export const VOLUNTEER_PROFILE_STATUSES = [
  'pending_confirmation',
  'confirmed',
  'active',
  'cancelled',
  'completed',
] as const;

// ============================================
// ENTITY TYPES
// ============================================

export interface VolunteerRole {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  description: string | null;
  responsibilities: string | null;
  requirements: string | null;
  nice_to_haves: string | null;
  benefits: string | null;
  included_benefits: string | null;
  excluded_benefits: string | null;
  commitment_type: VolunteerCommitmentType;
  availability_requirements: string | null;
  location_context: string | null;
  spots_available: number | null;
  show_spots_publicly: boolean;
  application_deadline: string | null;
  status: VolunteerRoleStatus;
  is_public: boolean;
  sort_order: number;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VolunteerApplication {
  id: string;
  application_id: string;
  role_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  linkedin_url: string;
  website_url: string | null;
  motivation: string;
  availability: string;
  relevant_experience: string;
  location: string | null;
  affiliation: string | null;
  notes: string | null;
  commitment_confirmed: boolean;
  exclusions_confirmed: boolean;
  contact_consent_confirmed: boolean;
  status: VolunteerApplicationStatus;
  internal_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string;
  updated_at: string;
}

export interface VolunteerApplicationWithRole extends VolunteerApplication {
  role_title: string;
  role_slug: string;
}

export interface VolunteerProfile {
  id: string;
  application_id: string | null;
  role_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  responsibilities: string | null;
  internal_contact: string | null;
  availability: string | null;
  status: VolunteerProfileStatus;
  is_public: boolean;
  public_bio: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface VolunteerProfileWithRole extends VolunteerProfile {
  role_title: string | null;
}

export interface VolunteerStats {
  open_roles: number;
  total_applications: number;
  pending_review: number;
  accepted: number;
  team_size: number;
}
