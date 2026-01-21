/**
 * CFP Review Types
 * Reviewer and review-related types
 */

import type { CfpReviewerRole } from './base';

/**
 * CFP Reviewer
 */
export interface CfpReviewer {
  id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  role: CfpReviewerRole;
  can_see_speaker_identity: boolean;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Review scores and feedback
 */
export interface CfpReview {
  id: string;
  submission_id: string;
  reviewer_id: string;
  score_overall: number | null;
  score_relevance: number | null;
  score_technical_depth: number | null;
  score_clarity: number | null;
  score_diversity: number | null;
  private_notes: string | null;
  feedback_to_speaker: string | null;
  created_at: string;
  updated_at: string;

  // Populated via join (optional)
  reviewer?: CfpReviewer;
}

/**
 * Aggregated review statistics for a submission
 */
export interface CfpSubmissionStats {
  submission_id: string;
  review_count: number;
  avg_overall: number | null;
  avg_relevance: number | null;
  avg_technical_depth: number | null;
  avg_clarity: number | null;
  avg_diversity: number | null;
}
