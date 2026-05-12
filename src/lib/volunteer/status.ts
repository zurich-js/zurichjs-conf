/**
 * Volunteer Status Utilities
 * Centralized status labels, badge tones, and transition logic
 */

import type {
  VolunteerRoleStatus,
  VolunteerApplicationStatus,
  VolunteerProfileStatus,
  VolunteerCommitmentType,
  VolunteerRole,
} from '@/lib/types/volunteer';

// ============================================
// ROLE STATUS
// ============================================

export const ROLE_STATUS_LABELS: Record<VolunteerRoleStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  closed: 'Closed',
  archived: 'Archived',
};

export function getRoleStatusTone(status: VolunteerRoleStatus): 'green' | 'amber' | 'blue' | 'red' {
  switch (status) {
    case 'published': return 'green';
    case 'draft': return 'blue';
    case 'closed': return 'amber';
    case 'archived': return 'red';
  }
}

// ============================================
// APPLICATION STATUS
// ============================================

export const APPLICATION_STATUS_LABELS: Record<VolunteerApplicationStatus, string> = {
  submitted: 'Submitted',
  in_review: 'In Review',
  shortlisted: 'Shortlisted',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export function getApplicationStatusTone(status: VolunteerApplicationStatus): 'green' | 'amber' | 'blue' | 'red' {
  switch (status) {
    case 'submitted': return 'blue';
    case 'in_review': return 'amber';
    case 'shortlisted': return 'amber';
    case 'accepted': return 'green';
    case 'rejected': return 'red';
    case 'withdrawn': return 'red';
  }
}

/**
 * Returns the set of statuses an application can transition to from its current status
 */
export function getAvailableApplicationTransitions(
  current: VolunteerApplicationStatus,
): VolunteerApplicationStatus[] {
  switch (current) {
    case 'submitted':
      return ['in_review', 'shortlisted', 'rejected', 'withdrawn'];
    case 'in_review':
      return ['shortlisted', 'accepted', 'rejected', 'withdrawn'];
    case 'shortlisted':
      return ['accepted', 'rejected', 'withdrawn'];
    case 'accepted':
      return ['withdrawn'];
    case 'rejected':
      return ['in_review'];
    case 'withdrawn':
      return [];
  }
}

// ============================================
// PROFILE STATUS
// ============================================

export const PROFILE_STATUS_LABELS: Record<VolunteerProfileStatus, string> = {
  pending_confirmation: 'Pending',
  confirmed: 'Confirmed',
  active: 'Active',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export function getProfileStatusTone(status: VolunteerProfileStatus): 'green' | 'amber' | 'blue' | 'red' {
  switch (status) {
    case 'pending_confirmation': return 'amber';
    case 'confirmed': return 'blue';
    case 'active': return 'green';
    case 'cancelled': return 'red';
    case 'completed': return 'green';
  }
}

// ============================================
// COMMITMENT TYPE
// ============================================

export const COMMITMENT_TYPE_LABELS: Record<VolunteerCommitmentType, string> = {
  workshop_day: 'Workshop Day',
  conference_day: 'Conference Day',
  both_days: 'Workshop & Conference',
  pre_event: 'Pre-Event',
  remote: 'Remote / Pre-Event',
  flexible: 'Flexible',
};

// ============================================
// PUBLIC DISPLAY HELPERS
// ============================================

export type PublicRoleDisplayStatus = 'open' | 'closing_soon' | 'closed';

/**
 * Determines the public-facing display status for a role
 * based on its status and application deadline
 */
export function getPublicRoleDisplayStatus(role: VolunteerRole): PublicRoleDisplayStatus {
  if (role.status === 'closed' || role.status === 'archived') {
    return 'closed';
  }

  if (role.status !== 'published') {
    return 'closed';
  }

  if (role.application_deadline) {
    const deadline = new Date(role.application_deadline);
    const now = new Date();
    const daysUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntilDeadline <= 0) return 'closed';
    if (daysUntilDeadline <= 7) return 'closing_soon';
  }

  return 'open';
}

export const PUBLIC_DISPLAY_STATUS_LABELS: Record<PublicRoleDisplayStatus, string> = {
  open: 'Open',
  closing_soon: 'Closing Soon',
  closed: 'Closed',
};

export function getPublicDisplayStatusTone(status: PublicRoleDisplayStatus): 'green' | 'amber' | 'red' {
  switch (status) {
    case 'open': return 'green';
    case 'closing_soon': return 'amber';
    case 'closed': return 'red';
  }
}
