/**
 * Volunteer Roles - Database Operations
 * Supabase queries for volunteer role CRUD
 */

import { createCfpServiceClient } from '@/lib/supabase/cfp-client';
import { logger } from '@/lib/logger';
import type { VolunteerRole } from '@/lib/types/volunteer';
import type { VolunteerRoleFormData } from '@/lib/validations/volunteer';

const log = logger.scope('Volunteer Roles');

/**
 * Get all published and public volunteer roles (for public job board)
 */
export async function getPublishedRoles(): Promise<{ data: VolunteerRole[] | null; error: string | null }> {
  try {
    const supabase = createCfpServiceClient();
    const { data, error } = await supabase
      .from('volunteer_roles')
      .select('*')
      .eq('status', 'published')
      .eq('is_public', true)
      .order('sort_order', { ascending: true });

    if (error) {
      log.error('Failed to fetch published roles', error);
      return { data: null, error: error.message };
    }

    return { data: data as VolunteerRole[], error: null };
  } catch (err) {
    log.error('Unexpected error fetching published roles', err instanceof Error ? err : null);
    return { data: null, error: 'Failed to fetch roles' };
  }
}

/**
 * Get a single published role by slug (for public detail page)
 */
export async function getRoleBySlug(slug: string): Promise<{ data: VolunteerRole | null; error: string | null }> {
  try {
    const supabase = createCfpServiceClient();
    const { data, error } = await supabase
      .from('volunteer_roles')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .eq('is_public', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: 'Role not found' };
      log.error('Failed to fetch role by slug', error);
      return { data: null, error: error.message };
    }

    return { data: data as VolunteerRole, error: null };
  } catch (err) {
    log.error('Unexpected error fetching role', err instanceof Error ? err : null);
    return { data: null, error: 'Failed to fetch role' };
  }
}

/**
 * Get all volunteer roles (admin)
 */
export async function getAllRoles(): Promise<{ data: VolunteerRole[] | null; error: string | null }> {
  try {
    const supabase = createCfpServiceClient();
    const { data, error } = await supabase
      .from('volunteer_roles')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Failed to fetch all roles', error);
      return { data: null, error: error.message };
    }

    return { data: data as VolunteerRole[], error: null };
  } catch (err) {
    log.error('Unexpected error fetching all roles', err instanceof Error ? err : null);
    return { data: null, error: 'Failed to fetch roles' };
  }
}

/**
 * Get a single role by ID (admin)
 */
export async function getRoleById(id: string): Promise<{ data: VolunteerRole | null; error: string | null }> {
  try {
    const supabase = createCfpServiceClient();
    const { data, error } = await supabase
      .from('volunteer_roles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: 'Role not found' };
      log.error('Failed to fetch role', error);
      return { data: null, error: error.message };
    }

    return { data: data as VolunteerRole, error: null };
  } catch (err) {
    log.error('Unexpected error fetching role', err instanceof Error ? err : null);
    return { data: null, error: 'Failed to fetch role' };
  }
}

/**
 * Create a new volunteer role (admin)
 */
export async function createRole(data: VolunteerRoleFormData): Promise<{ data: VolunteerRole | null; error: string | null }> {
  try {
    const supabase = createCfpServiceClient();
    const { data: role, error } = await supabase
      .from('volunteer_roles')
      .insert(data)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return { data: null, error: 'A role with this slug already exists' };
      log.error('Failed to create role', error);
      return { data: null, error: error.message };
    }

    log.info('Role created', { roleId: role.id, title: role.title });
    return { data: role as VolunteerRole, error: null };
  } catch (err) {
    log.error('Unexpected error creating role', err instanceof Error ? err : null);
    return { data: null, error: 'Failed to create role' };
  }
}

/**
 * Update a volunteer role (admin)
 */
export async function updateRole(id: string, data: Partial<VolunteerRoleFormData>): Promise<{ data: VolunteerRole | null; error: string | null }> {
  try {
    const supabase = createCfpServiceClient();
    const { data: role, error } = await supabase
      .from('volunteer_roles')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return { data: null, error: 'A role with this slug already exists' };
      log.error('Failed to update role', error);
      return { data: null, error: error.message };
    }

    log.info('Role updated', { roleId: id });
    return { data: role as VolunteerRole, error: null };
  } catch (err) {
    log.error('Unexpected error updating role', err instanceof Error ? err : null);
    return { data: null, error: 'Failed to update role' };
  }
}

/**
 * Delete a volunteer role (admin)
 * Fails if the role has any applications
 */
export async function deleteRole(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createCfpServiceClient();

    // Check for existing applications
    const { count } = await supabase
      .from('volunteer_applications')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', id);

    if (count && count > 0) {
      return { success: false, error: 'Cannot delete role with existing applications' };
    }

    const { error } = await supabase
      .from('volunteer_roles')
      .delete()
      .eq('id', id);

    if (error) {
      log.error('Failed to delete role', error);
      return { success: false, error: error.message };
    }

    log.info('Role deleted', { roleId: id });
    return { success: true, error: null };
  } catch (err) {
    log.error('Unexpected error deleting role', err instanceof Error ? err : null);
    return { success: false, error: 'Failed to delete role' };
  }
}

/**
 * Get application count per role (admin helper)
 */
export async function getRoleApplicationCounts(): Promise<Record<string, number>> {
  try {
    const supabase = createCfpServiceClient();
    const { data, error } = await supabase
      .from('volunteer_applications')
      .select('role_id');

    if (error || !data) return {};

    const counts: Record<string, number> = {};
    for (const row of data) {
      counts[row.role_id] = (counts[row.role_id] || 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}
