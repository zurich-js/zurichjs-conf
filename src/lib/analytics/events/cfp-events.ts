/**
 * CFP Analytics Events
 * Events related to Call for Papers system
 */

import type { BaseEventProperties } from './base';

export interface CfpLoginRequestedEvent {
  event: 'cfp_login_requested';
  properties: BaseEventProperties & {
    email: string;
  };
}

export interface CfpSpeakerAuthenticatedEvent {
  event: 'cfp_speaker_authenticated';
  properties: BaseEventProperties & {
    speaker_id: string;
    is_new_speaker: boolean;
    is_profile_complete: boolean;
  };
}

export interface CfpSubmissionCreatedEvent {
  event: 'cfp_submission_created';
  properties: BaseEventProperties & {
    submission_id: string;
    submission_type: string;
    submission_level: string;
    speaker_id: string;
  };
}

export interface CfpSubmissionSubmittedEvent {
  event: 'cfp_submission_submitted';
  properties: BaseEventProperties & {
    submission_id: string;
    submission_title: string;
    submission_type: string;
    speaker_id: string;
  };
}

export interface CfpSubmissionWithdrawnEvent {
  event: 'cfp_submission_withdrawn';
  properties: BaseEventProperties & {
    submission_id: string;
    submission_title: string;
    speaker_id: string;
  };
}

export interface CfpSubmissionStatusChangedEvent {
  event: 'cfp_submission_status_changed';
  properties: BaseEventProperties & {
    submission_id: string;
    submission_title: string;
    old_status: string;
    new_status: string;
    changed_by: string;
  };
}

export interface CfpReviewerAuthenticatedEvent {
  event: 'cfp_reviewer_authenticated';
  properties: BaseEventProperties & {
    reviewer_id: string;
    reviewer_email: string;
  };
}

export interface CfpReviewSubmittedEvent {
  event: 'cfp_review_submitted';
  properties: BaseEventProperties & {
    submission_id: string;
    reviewer_id: string;
    overall_score: number;
  };
}
