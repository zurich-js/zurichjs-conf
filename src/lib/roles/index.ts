/**
 * Roles Module Exports
 */

export {
  ROLES,
  ROLE_HIERARCHY,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  DEFAULT_ROLE,
  hasRolePermission,
  isAdmin,
  isSpeaker,
  isAttendee,
} from './constants';

export {
  canAccessRole,
  canManageUser,
  canManageTickets,
  canManageWorkshops,
  canViewWorkshopRegistrations,
} from './guards';

export type { GuardResult } from './guards';
