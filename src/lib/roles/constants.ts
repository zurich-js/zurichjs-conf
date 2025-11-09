/**
 * Role Constants
 * Centralized role definitions and permissions
 */

import type { UserRole } from '@/lib/types/database';

/**
 * All available user roles
 */
export const ROLES: Record<string, UserRole> = {
  ATTENDEE: 'attendee',
  SPEAKER: 'speaker',
  ADMIN: 'admin',
} as const;

/**
 * Role hierarchy (higher number = more permissions)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  attendee: 1,
  speaker: 2,
  admin: 3,
};

/**
 * Role display names
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  attendee: 'Attendee',
  speaker: 'Speaker',
  admin: 'Administrator',
};

/**
 * Role descriptions
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  attendee: 'Conference attendee with ticket access',
  speaker: 'Conference speaker with presentation privileges',
  admin: 'Platform administrator with full access',
};

/**
 * Default role for new users
 */
export const DEFAULT_ROLE: UserRole = ROLES.ATTENDEE;

/**
 * Check if a user role has permission to access a resource requiring a specific role
 */
export function hasRolePermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if a user is an admin
 */
export function isAdmin(role: UserRole): boolean {
  return role === ROLES.ADMIN;
}

/**
 * Check if a user is a speaker
 */
export function isSpeaker(role: UserRole): boolean {
  return role === ROLES.SPEAKER || isAdmin(role);
}

/**
 * Check if a user is an attendee
 */
export function isAttendee(role: UserRole): boolean {
  return role === ROLES.ATTENDEE || isSpeaker(role);
}
