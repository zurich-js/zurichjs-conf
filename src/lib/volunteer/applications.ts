/**
 * Volunteer Applications - Database Operations
 * Supabase queries for volunteer application management
 */

import { createCfpServiceClient } from '@/lib/supabase/cfp-client';
import { logger } from '@/lib/logger';
import type {
  VolunteerApplication,
  VolunteerApplicationWithRole,
  VolunteerApplicationStatus,
} from '@/lib/types/volunteer';
import type { VolunteerApplicationFormData } from '@/lib/validations/volunteer';

const log = logger.scope('Volunteer Applications');

/**
 * Generate a human-readable application ID (e.g. VOL-LXK8E2-A3BF91)
 */
export function generateApplicationId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `VOL-${timestamp}-${randomStr}`.toUpperCase();
}

/**
 * Submit a new volunteer application (public)
 */
export async function submitApplication(
  formData: VolunteerApplicationFormData,
): Promise<{ data: VolunteerApplication | null; error: string | null }> {
  try {
    const supabase = createCfpServiceClient();

    // Check for duplicate application (same role + email)
    const { data: existing } = await supabase
      .from('volunteer_applications')
      .select('id')
      .eq('role_id', formData.role_id)
      .eq('email', formData.email)
      .single();

    if (existing) {
      return { data: null, error: 'You have already applied for this role' };
    }

    // Check role exists and is published
    const { data: role } = await supabase
      .from('volunteer_roles')
      .select('id, status, application_deadline')
      .eq('id', formData.role_id)
      .eq('status', 'published')
      .single();

    if (!role) {
      return { data: null, error: 'This volunteer role is no longer accepting applications' };
    }

    // Check deadline
    if (role.application_deadline) {
      const deadline = new Date(role.application_deadline);
      if (deadline < new Date()) {
        return { data: null, error: 'The application deadline for this role has passed' };
      }
    }

    const applicationId = generateApplicationId();
    const { data, error } = await supabase
      .from('volunteer_applications')
      .insert({
        application_id: applicationId,
        role_id: formData.role_id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        linkedin_url: formData.linkedin_url,
        website_url: formData.website_url || null,
        motivation: formData.motivation,
        availability: formData.availability,
        relevant_experience: formData.relevant_experience,
        affiliation: formData.affiliation || null,
        notes: formData.notes || null,
        commitment_confirmed: formData.commitment_confirmed,
        exclusions_confirmed: formData.exclusions_confirmed,
        contact_consent_confirmed: formData.contact_consent_confirmed,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'You have already applied for this role' };
      }
      log.error('Failed to submit application', error);
      return { data: null, error: error.message };
    }

    log.info('Application submitted', {
      applicationId,
      roleId: formData.role_id,
      email: formData.email,
    });

    return { data: data as VolunteerApplication, error: null };
  } catch (err) {
    log.error('Unexpected error submitting application', err instanceof Error ? err : null);
    return { data: null, error: 'Failed to submit application' };
  }
}

/**
 * Get all applications with optional filters (admin)
 */
export async function getApplications(filters?: {
  role_id?: string;
  status?: VolunteerApplicationStatus;
  search?: string;
}): Promise<{ data: VolunteerApplicationWithRole[] | null; error: string | null }> {
  try {
    const supabase = createCfpServiceClient();

    // Fetch applications
    let query = supabase
      .from('volunteer_applications')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (filters?.role_id) {
      query = query.eq('role_id', filters.role_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data: applications, error } = await query;

    if (error) {
      log.error('Failed to fetch applications', error);
      return { data: null, error: error.message };
    }

    if (!applications || applications.length === 0) {
      return { data: [], error: null };
    }

    // Fetch role info for display
    const roleIds = [...new Set(applications.map((a: VolunteerApplication) => a.role_id))];
    const { data: roles } = await supabase
      .from('volunteer_roles')
      .select('id, title, slug')
      .in('id', roleIds);

    const roleMap = new Map((roles || []).map((r: { id: string; title: string; slug: string }) => [r.id, r]));

    let result: VolunteerApplicationWithRole[] = applications.map((app: VolunteerApplication) => {
      const role = roleMap.get(app.role_id);
      return {
        ...app,
        role_title: role?.title || 'Unknown Role',
        role_slug: role?.slug || '',
      };
    });

    // Apply search filter in-memory
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (a) =>
          a.first_name.toLowerCase().includes(q) ||
          a.last_name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.application_id.toLowerCase().includes(q),
      );
    }

    return { data: result, error: null };
  } catch (err) {
    log.error('Unexpected error fetching applications', err instanceof Error ? err : null);
    return { data: null, error: 'Failed to fetch applications' };
  }
}

/**
 * Get a single application by ID (admin)
 */
export async function getApplicationById(
  id: string,
): Promise<{ data: VolunteerApplicationWithRole | null; error: string | null }> {
  try {
    const supabase = createCfpServiceClient();
    const { data: app, error } = await supabase
      .from('volunteer_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: 'Application not found' };
      log.error('Failed to fetch application', error);
      return { data: null, error: error.message };
    }

    // Fetch role info
    const { data: role } = await supabase
      .from('volunteer_roles')
      .select('id, title, slug')
      .eq('id', app.role_id)
      .single();

    return {
      data: {
        ...app,
        role_title: role?.title || 'Unknown Role',
        role_slug: role?.slug || '',
      } as VolunteerApplicationWithRole,
      error: null,
    };
  } catch (err) {
    log.error('Unexpected error fetching application', err instanceof Error ? err : null);
    return { data: null, error: 'Failed to fetch application' };
  }
}

/**
 * Update application status (admin)
 */
export async function updateApplicationStatus(
  id: string,
  status: VolunteerApplicationStatus,
  reviewedBy?: string,
): Promise<{ data: VolunteerApplication | null; error: string | null }> {
  try {
    const supabase = createCfpServiceClient();
    const { data, error } = await supabase
      .from('volunteer_applications')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      log.error('Failed to update application status', error);
      return { data: null, error: error.message };
    }

    log.info('Application status updated', { applicationId: id, status });
    return { data: data as VolunteerApplication, error: null };
  } catch (err) {
    log.error('Unexpected error updating application status', err instanceof Error ? err : null);
    return { data: null, error: 'Failed to update status' };
  }
}

/**
 * Update application internal notes (admin)
 */
export async function updateApplicationNotes(
  id: string,
  internalNotes: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createCfpServiceClient();
    const { error } = await supabase
      .from('volunteer_applications')
      .update({ internal_notes: internalNotes })
      .eq('id', id);

    if (error) {
      log.error('Failed to update application notes', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    log.error('Unexpected error updating notes', err instanceof Error ? err : null);
    return { success: false, error: 'Failed to update notes' };
  }
}
