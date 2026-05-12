/**
 * Volunteer Profiles - Database Operations
 * Supabase queries for volunteer profile management
 */

import { createCfpServiceClient } from '@/lib/supabase/cfp-client';
import { logger } from '@/lib/logger';
import type {
  VolunteerProfile,
  VolunteerProfileWithRole,
} from '@/lib/types/volunteer';
import type { VolunteerProfileFormData } from '@/lib/validations/volunteer';

const log = logger.scope('Volunteer Profiles');

/**
 * Create a volunteer profile from an accepted application
 */
export async function createProfileFromApplication(
  applicationId: string,
): Promise<{ data: VolunteerProfile | null; error: string | null }> {
  try {
    const supabase = createCfpServiceClient();

    // Fetch the application
    const { data: app, error: appError } = await supabase
      .from('volunteer_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appError || !app) {
      return { data: null, error: 'Application not found' };
    }

    if (app.status !== 'accepted') {
      return { data: null, error: 'Application must be accepted before creating a profile' };
    }

    // Check if profile already exists for this application
    const { data: existing } = await supabase
      .from('volunteer_profiles')
      .select('id')
      .eq('application_id', applicationId)
      .single();

    if (existing) {
      return { data: null, error: 'A profile already exists for this application' };
    }

    const { data: profile, error } = await supabase
      .from('volunteer_profiles')
      .insert({
        application_id: applicationId,
        role_id: app.role_id,
        first_name: app.first_name,
        last_name: app.last_name,
        email: app.email,
        phone: app.phone,
        linkedin_url: app.linkedin_url,
        availability: app.availability,
      })
      .select()
      .single();

    if (error) {
      log.error('Failed to create profile from application', error);
      return { data: null, error: error.message };
    }

    log.info('Profile created from application', {
      profileId: profile.id,
      applicationId,
    });

    return { data: profile as VolunteerProfile, error: null };
  } catch (err) {
    log.error('Unexpected error creating profile', err instanceof Error ? err : null);
    return { data: null, error: 'Failed to create profile' };
  }
}

/**
 * Create a volunteer profile manually (admin)
 */
export async function createProfile(
  data: VolunteerProfileFormData,
): Promise<{ data: VolunteerProfile | null; error: string | null }> {
  try {
    const supabase = createCfpServiceClient();
    const { data: profile, error } = await supabase
      .from('volunteer_profiles')
      .insert({
        ...data,
        application_id: data.application_id || null,
        role_id: data.role_id || null,
        phone: data.phone || null,
        linkedin_url: data.linkedin_url || null,
        responsibilities: data.responsibilities || null,
        internal_contact: data.internal_contact || null,
        availability: data.availability || null,
        public_bio: data.public_bio || null,
        photo_url: data.photo_url || null,
      })
      .select()
      .single();

    if (error) {
      log.error('Failed to create profile', error);
      return { data: null, error: error.message };
    }

    log.info('Profile created', { profileId: profile.id });
    return { data: profile as VolunteerProfile, error: null };
  } catch (err) {
    log.error('Unexpected error creating profile', err instanceof Error ? err : null);
    return { data: null, error: 'Failed to create profile' };
  }
}

/**
 * Get all volunteer profiles with role info (admin)
 */
export async function getProfiles(): Promise<{ data: VolunteerProfileWithRole[] | null; error: string | null }> {
  try {
    const supabase = createCfpServiceClient();
    const { data: profiles, error } = await supabase
      .from('volunteer_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Failed to fetch profiles', error);
      return { data: null, error: error.message };
    }

    if (!profiles || profiles.length === 0) {
      return { data: [], error: null };
    }

    // Fetch role info
    const roleIds = [...new Set(profiles.map((p: VolunteerProfile) => p.role_id).filter(Boolean))] as string[];
    let roleMap = new Map<string, string>();

    if (roleIds.length > 0) {
      const { data: roles } = await supabase
        .from('volunteer_roles')
        .select('id, title')
        .in('id', roleIds);

      roleMap = new Map((roles || []).map((r: { id: string; title: string }) => [r.id, r.title]));
    }

    const result: VolunteerProfileWithRole[] = profiles.map((p: VolunteerProfile) => ({
      ...p,
      role_title: p.role_id ? (roleMap.get(p.role_id) || null) : null,
    }));

    return { data: result, error: null };
  } catch (err) {
    log.error('Unexpected error fetching profiles', err instanceof Error ? err : null);
    return { data: null, error: 'Failed to fetch profiles' };
  }
}

/**
 * Get a single profile by ID (admin)
 */
export async function getProfileById(
  id: string,
): Promise<{ data: VolunteerProfileWithRole | null; error: string | null }> {
  try {
    const supabase = createCfpServiceClient();
    const { data: profile, error } = await supabase
      .from('volunteer_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: 'Profile not found' };
      log.error('Failed to fetch profile', error);
      return { data: null, error: error.message };
    }

    let roleTitle: string | null = null;
    if (profile.role_id) {
      const { data: role } = await supabase
        .from('volunteer_roles')
        .select('title')
        .eq('id', profile.role_id)
        .single();
      roleTitle = role?.title || null;
    }

    return {
      data: { ...profile, role_title: roleTitle } as VolunteerProfileWithRole,
      error: null,
    };
  } catch (err) {
    log.error('Unexpected error fetching profile', err instanceof Error ? err : null);
    return { data: null, error: 'Failed to fetch profile' };
  }
}

/**
 * Update a volunteer profile (admin)
 */
export async function updateProfile(
  id: string,
  data: Partial<VolunteerProfileFormData>,
): Promise<{ data: VolunteerProfile | null; error: string | null }> {
  try {
    const supabase = createCfpServiceClient();
    const { data: profile, error } = await supabase
      .from('volunteer_profiles')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      log.error('Failed to update profile', error);
      return { data: null, error: error.message };
    }

    log.info('Profile updated', { profileId: id });
    return { data: profile as VolunteerProfile, error: null };
  } catch (err) {
    log.error('Unexpected error updating profile', err instanceof Error ? err : null);
    return { data: null, error: 'Failed to update profile' };
  }
}

/**
 * Get public volunteer profiles (for optional public team display)
 */
export async function getPublicProfiles(): Promise<{ data: VolunteerProfileWithRole[] | null; error: string | null }> {
  try {
    const supabase = createCfpServiceClient();
    const { data: profiles, error } = await supabase
      .from('volunteer_profiles')
      .select('*')
      .eq('is_public', true)
      .in('status', ['confirmed', 'active'])
      .order('created_at', { ascending: true });

    if (error) {
      log.error('Failed to fetch public profiles', error);
      return { data: null, error: error.message };
    }

    if (!profiles || profiles.length === 0) {
      return { data: [], error: null };
    }

    const roleIds = [...new Set(profiles.map((p: VolunteerProfile) => p.role_id).filter(Boolean))] as string[];
    let roleMap = new Map<string, string>();

    if (roleIds.length > 0) {
      const { data: roles } = await supabase
        .from('volunteer_roles')
        .select('id, title')
        .in('id', roleIds);
      roleMap = new Map((roles || []).map((r: { id: string; title: string }) => [r.id, r.title]));
    }

    return {
      data: profiles.map((p: VolunteerProfile) => ({
        ...p,
        role_title: p.role_id ? (roleMap.get(p.role_id) || null) : null,
      })),
      error: null,
    };
  } catch (err) {
    log.error('Unexpected error fetching public profiles', err instanceof Error ? err : null);
    return { data: null, error: 'Failed to fetch profiles' };
  }
}
