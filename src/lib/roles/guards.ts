/**
 * Role Guards
 * Client-side and server-side role checking utilities
 */

import type { Profile, UserRole } from '@/lib/types/database';
import { hasRolePermission, isAdmin } from './constants';

/**
 * Guard result type
 */
export interface GuardResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a user can access a resource requiring a specific role
 */
export function canAccessRole(profile: Profile, requiredRole: UserRole): GuardResult {
  if (!profile) {
    return {
      allowed: false,
      reason: 'No user profile found',
    };
  }

  const allowed = hasRolePermission(profile.role, requiredRole);

  if (!allowed) {
    return {
      allowed: false,
      reason: `Insufficient permissions. Required: ${requiredRole}, Current: ${profile.role}`,
    };
  }

  return { allowed: true };
}

/**
 * Check if a user can manage another user
 * Only admins can manage other users
 */
export function canManageUser(profile: Profile, targetUserId: string): GuardResult {
  if (!profile) {
    return {
      allowed: false,
      reason: 'No user profile found',
    };
  }

  // Users can manage themselves
  if (profile.id === targetUserId) {
    return { allowed: true };
  }

  // Only admins can manage other users
  if (!isAdmin(profile.role)) {
    return {
      allowed: false,
      reason: 'Only administrators can manage other users',
    };
  }

  return { allowed: true };
}

/**
 * Check if a user can manage tickets
 * Admins can manage all tickets, users can only view their own
 */
export function canManageTickets(profile: Profile): GuardResult {
  if (!profile) {
    return {
      allowed: false,
      reason: 'No user profile found',
    };
  }

  if (!isAdmin(profile.role)) {
    return {
      allowed: false,
      reason: 'Only administrators can manage tickets',
    };
  }

  return { allowed: true };
}

/**
 * Check if a user can manage workshops
 * Admins can manage all workshops, speakers can manage their own
 */
export function canManageWorkshops(profile: Profile, workshopInstructorId?: string): GuardResult {
  if (!profile) {
    return {
      allowed: false,
      reason: 'No user profile found',
    };
  }

  // Admins can manage all workshops
  if (isAdmin(profile.role)) {
    return { allowed: true };
  }

  // Speakers can manage their own workshops
  if (profile.role === 'speaker' && workshopInstructorId === profile.id) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Insufficient permissions to manage this workshop',
  };
}

/**
 * Check if a user can view workshop registrations
 * Admins and workshop instructors can view registrations
 */
export function canViewWorkshopRegistrations(
  profile: Profile,
  workshopInstructorId?: string
): GuardResult {
  if (!profile) {
    return {
      allowed: false,
      reason: 'No user profile found',
    };
  }

  // Admins can view all registrations
  if (isAdmin(profile.role)) {
    return { allowed: true };
  }

  // Instructors can view their workshop registrations
  if (workshopInstructorId === profile.id) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Insufficient permissions to view registrations',
  };
}
