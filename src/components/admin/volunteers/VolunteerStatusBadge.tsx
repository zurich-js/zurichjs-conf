/**
 * Volunteer Status Badge
 * Wraps the admin Pill component with volunteer-specific status tones
 */

import { Pill } from '@/components/admin/shared/Pill';
import {
  ROLE_STATUS_LABELS,
  getRoleStatusTone,
  APPLICATION_STATUS_LABELS,
  getApplicationStatusTone,
  PROFILE_STATUS_LABELS,
  getProfileStatusTone,
} from '@/lib/volunteer/status';
import type {
  VolunteerRoleStatus,
  VolunteerApplicationStatus,
  VolunteerProfileStatus,
} from '@/lib/types/volunteer';

type BadgeType = 'role' | 'application' | 'profile';

interface VolunteerStatusBadgeProps {
  status: string;
  type: BadgeType;
}

export function VolunteerStatusBadge({ status, type }: VolunteerStatusBadgeProps) {
  const label =
    type === 'role'
      ? ROLE_STATUS_LABELS[status as VolunteerRoleStatus] || status
      : type === 'application'
        ? APPLICATION_STATUS_LABELS[status as VolunteerApplicationStatus] || status
        : PROFILE_STATUS_LABELS[status as VolunteerProfileStatus] || status;

  const tone =
    type === 'role'
      ? getRoleStatusTone(status as VolunteerRoleStatus)
      : type === 'application'
        ? getApplicationStatusTone(status as VolunteerApplicationStatus)
        : getProfileStatusTone(status as VolunteerProfileStatus);

  return <Pill tone={tone}>{label}</Pill>;
}
