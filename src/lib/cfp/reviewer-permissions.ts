import type { CfpReviewerRole } from '@/lib/types/cfp';

export type ReviewerAccessLevel = 'anonymous' | 'committee' | 'admin' | 'readonly';

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
    case 'super_admin':
      return {
        accessLevel: 'admin',
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
    case 'committee_member':
      return {
        accessLevel: 'committee',
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
    case 'readonly':
      return {
        accessLevel: 'readonly',
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
    case 'reviewer':
    default:
      return {
        accessLevel: 'anonymous',
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
    case 'super_admin':
      return 'Super Admin';
    case 'committee_member':
      return 'Committee Member';
    case 'readonly':
      return 'Read Only';
    case 'reviewer':
    default:
      return 'Anonymous Review';
  }
}
