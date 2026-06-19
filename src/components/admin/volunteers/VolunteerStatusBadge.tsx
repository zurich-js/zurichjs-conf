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
} from '@/lib/volunteer/status';
import type {
  VolunteerRoleStatus,
  VolunteerApplicationStatus,
} from '@/lib/types/volunteer';

type BadgeType = 'role' | 'application';

interface VolunteerStatusBadgeProps {
  status: string;
  type: BadgeType;
}

export function VolunteerStatusBadge({ status, type }: VolunteerStatusBadgeProps) {
  const label =
    type === 'role'
      ? ROLE_STATUS_LABELS[status as VolunteerRoleStatus] || status
      : APPLICATION_STATUS_LABELS[status as VolunteerApplicationStatus] || status;

  const tone =
    type === 'role'
      ? getRoleStatusTone(status as VolunteerRoleStatus)
      : getApplicationStatusTone(status as VolunteerApplicationStatus);

  return <Pill tone={tone}>{label}</Pill>;
}
