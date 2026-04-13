import { CFP_REVIEWER_ROLES, type CfpReviewerRole } from '@/lib/types/cfp';

export const REVIEWER_ACCESS_LEVELS = {
  ANONYMOUS: 'anonymous',
  COMMITTEE: 'committee',
  ADMIN: 'admin',
  READONLY: 'readonly',
} as const;

export type ReviewerAccessLevel = typeof REVIEWER_ACCESS_LEVELS[keyof typeof REVIEWER_ACCESS_LEVELS];

export interface ReviewerPermissions {
  accessLevel: ReviewerAccessLevel;
  canReview: boolean;
  canSeeSpeakerIdentity: boolean;
  canSeeSpeakerEmail: boolean;
  canSeeSpeakerResources: boolean;
  canSeeTravelDetails: boolean;
  canSeeReviewStats: boolean;
  canSeeCommitteeReviews: boolean;
  canSeeReviewerIdentity: boolean;
  canChangeSubmissionStatus: boolean;
  canUseReviewBasedFilters: boolean;
  canSeeDecisionStatuses: boolean;
}

export function getReviewerPermissions(role: CfpReviewerRole): ReviewerPermissions {
  switch (role) {
    case CFP_REVIEWER_ROLES.SUPER_ADMIN:
      return {
        accessLevel: REVIEWER_ACCESS_LEVELS.ADMIN,
        canReview: true,
        canSeeSpeakerIdentity: true,
        canSeeSpeakerEmail: true,
        canSeeSpeakerResources: true,
        canSeeTravelDetails: true,
        canSeeReviewStats: true,
        canSeeCommitteeReviews: true,
        canSeeReviewerIdentity: true,
        canChangeSubmissionStatus: true,
        canUseReviewBasedFilters: true,
        canSeeDecisionStatuses: true,
      };
    case CFP_REVIEWER_ROLES.COMMITTEE_MEMBER:
      return {
        accessLevel: REVIEWER_ACCESS_LEVELS.COMMITTEE,
        canReview: true,
        canSeeSpeakerIdentity: true,
        canSeeSpeakerEmail: false,
        canSeeSpeakerResources: true,
        canSeeTravelDetails: true,
        canSeeReviewStats: true,
        canSeeCommitteeReviews: true,
        canSeeReviewerIdentity: false,
        canChangeSubmissionStatus: false,
        canUseReviewBasedFilters: true,
        canSeeDecisionStatuses: true,
      };
    case CFP_REVIEWER_ROLES.READONLY:
      return {
        accessLevel: REVIEWER_ACCESS_LEVELS.READONLY,
        canReview: false,
        canSeeSpeakerIdentity: false,
        canSeeSpeakerEmail: false,
        canSeeSpeakerResources: false,
        canSeeTravelDetails: false,
        canSeeReviewStats: false,
        canSeeCommitteeReviews: false,
        canSeeReviewerIdentity: false,
        canChangeSubmissionStatus: false,
        canUseReviewBasedFilters: false,
        canSeeDecisionStatuses: false,
      };
    case CFP_REVIEWER_ROLES.REVIEWER:
    default:
      return {
        accessLevel: REVIEWER_ACCESS_LEVELS.ANONYMOUS,
        canReview: true,
        canSeeSpeakerIdentity: false,
        canSeeSpeakerEmail: false,
        canSeeSpeakerResources: false,
        canSeeTravelDetails: false,
        canSeeReviewStats: false,
        canSeeCommitteeReviews: false,
        canSeeReviewerIdentity: false,
        canChangeSubmissionStatus: false,
        canUseReviewBasedFilters: false,
        canSeeDecisionStatuses: false,
      };
  }
}

export function getReviewerAccessLabel(role: CfpReviewerRole): string {
  switch (role) {
    case CFP_REVIEWER_ROLES.SUPER_ADMIN:
      return 'Super Admin';
    case CFP_REVIEWER_ROLES.COMMITTEE_MEMBER:
      return 'Committee Member';
    case CFP_REVIEWER_ROLES.READONLY:
      return 'Read Only';
    case CFP_REVIEWER_ROLES.REVIEWER:
    default:
      return 'Anonymous Review';
  }
}
