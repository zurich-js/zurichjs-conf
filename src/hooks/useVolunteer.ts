/**
 * Volunteer Hooks
 * TanStack Query hooks for volunteer roles, applications, and profiles
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { volunteerKeys } from '@/lib/query-keys';
import { endpoints } from '@/lib/api/config';
import type {
  VolunteerRole,
  VolunteerApplication,
  VolunteerApplicationWithRole,
  VolunteerProfile,
  VolunteerProfileWithRole,
  VolunteerStats,
  VolunteerApplicationStatus,
} from '@/lib/types/volunteer';
import type { VolunteerApplicationFormData, VolunteerRoleFormData, VolunteerProfileFormData } from '@/lib/validations/volunteer';

// ============================================
// HELPERS
// ============================================

class ApiError extends Error {
  issues?: Array<{ path: string[]; message: string }>;
  constructor(message: string, issues?: Array<{ path: string[]; message: string }>) {
    super(message);
    this.issues = issues;
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || `Request failed (${res.status})`, body.issues);
  }
  return res.json();
}

export { ApiError };

// ============================================
// PUBLIC HOOKS
// ============================================

export function usePublicVolunteerRoles() {
  return useQuery({
    queryKey: volunteerKeys.publicRoles(),
    queryFn: () =>
      fetchJson<{ roles: VolunteerRole[] }>(endpoints.volunteers.publicRoles()),
    select: (data) => data.roles,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicVolunteerRole(slug: string | undefined) {
  return useQuery({
    queryKey: volunteerKeys.publicRole(slug || ''),
    queryFn: () =>
      fetchJson<{ role: VolunteerRole }>(endpoints.volunteers.publicRole(slug!)),
    select: (data) => data.role,
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubmitVolunteerApplication() {
  return useMutation({
    mutationFn: (data: VolunteerApplicationFormData) =>
      fetchJson<{ success: boolean; applicationId: string; message: string }>(
        endpoints.volunteers.apply(),
        { method: 'POST', body: JSON.stringify(data) },
      ),
  });
}

// ============================================
// ADMIN: ROLES
// ============================================

export function useVolunteerRoles() {
  return useQuery({
    queryKey: volunteerKeys.roles(),
    queryFn: () =>
      fetchJson<{ roles: (VolunteerRole & { application_count: number })[] }>(
        endpoints.volunteers.adminRoles(),
      ),
    select: (data) => data.roles,
    staleTime: 60 * 1000,
  });
}

export function useVolunteerRole(id: string | undefined) {
  return useQuery({
    queryKey: volunteerKeys.role(id || ''),
    queryFn: () =>
      fetchJson<{ role: VolunteerRole }>(endpoints.volunteers.adminRole(id!)),
    select: (data) => data.role,
    enabled: !!id,
  });
}

export function useCreateVolunteerRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: VolunteerRoleFormData) =>
      fetchJson<{ role: VolunteerRole }>(endpoints.volunteers.adminRoles(), {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: volunteerKeys.roles() });
      queryClient.invalidateQueries({ queryKey: volunteerKeys.stats() });
    },
  });
}

export function useUpdateVolunteerRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VolunteerRoleFormData> }) =>
      fetchJson<{ role: VolunteerRole }>(endpoints.volunteers.adminRole(id), {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: volunteerKeys.roles() });
      queryClient.invalidateQueries({ queryKey: volunteerKeys.role(variables.id) });
      queryClient.invalidateQueries({ queryKey: volunteerKeys.stats() });
    },
  });
}

export function useDeleteVolunteerRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ success: boolean }>(endpoints.volunteers.adminRole(id), {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: volunteerKeys.roles() });
      queryClient.invalidateQueries({ queryKey: volunteerKeys.stats() });
    },
  });
}

// ============================================
// ADMIN: APPLICATIONS
// ============================================

export function useVolunteerApplications(filters?: {
  status?: VolunteerApplicationStatus;
  role_id?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.role_id) params.set('role_id', filters.role_id);
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString();
  const url = `${endpoints.volunteers.adminApplications()}${qs ? `?${qs}` : ''}`;

  return useQuery({
    queryKey: volunteerKeys.applications(filters as Record<string, unknown>),
    queryFn: () =>
      fetchJson<{ applications: VolunteerApplicationWithRole[] }>(url),
    select: (data) => data.applications,
    staleTime: 30 * 1000,
  });
}

export function useVolunteerApplication(id: string | undefined) {
  return useQuery({
    queryKey: volunteerKeys.application(id || ''),
    queryFn: () =>
      fetchJson<{ application: VolunteerApplicationWithRole }>(
        endpoints.volunteers.adminApplication(id!),
      ),
    select: (data) => data.application,
    enabled: !!id,
  });
}

export function useUpdateVolunteerApplicationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      internal_notes,
    }: {
      id: string;
      status: VolunteerApplicationStatus;
      internal_notes?: string;
    }) =>
      fetchJson<{ application: VolunteerApplication }>(
        endpoints.volunteers.adminApplicationStatus(id),
        { method: 'POST', body: JSON.stringify({ status, internal_notes }) },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: volunteerKeys.all });
    },
  });
}

// ============================================
// ADMIN: PROFILES
// ============================================

export function useVolunteerProfiles() {
  return useQuery({
    queryKey: volunteerKeys.profiles(),
    queryFn: () =>
      fetchJson<{ profiles: VolunteerProfileWithRole[] }>(
        endpoints.volunteers.adminProfiles(),
      ),
    select: (data) => data.profiles,
    staleTime: 60 * 1000,
  });
}

export function useCreateVolunteerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: VolunteerProfileFormData | { from_application_id: string }) =>
      fetchJson<{ profile: VolunteerProfile }>(endpoints.volunteers.adminProfiles(), {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: volunteerKeys.profiles() });
      queryClient.invalidateQueries({ queryKey: volunteerKeys.stats() });
    },
  });
}

export function useUpdateVolunteerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VolunteerProfileFormData> }) =>
      fetchJson<{ profile: VolunteerProfile }>(endpoints.volunteers.adminProfile(id), {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: volunteerKeys.profiles() });
      queryClient.invalidateQueries({ queryKey: volunteerKeys.profile(variables.id) });
    },
  });
}

// ============================================
// ADMIN: STATS
// ============================================

export function useVolunteerStats() {
  return useQuery({
    queryKey: volunteerKeys.stats(),
    queryFn: () =>
      fetchJson<{ stats: VolunteerStats }>(endpoints.volunteers.adminStats()),
    select: (data) => data.stats,
    staleTime: 30 * 1000,
  });
}
