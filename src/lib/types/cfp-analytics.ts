/**
 * CFP Analytics Types
 * Types for the CFP analytics dashboard
 */

export interface CfpAnalytics {
  /** Submission funnel: how submissions flow through statuses */
  funnel: CfpFunnelData;
  /** Breakdown by submission type */
  byType: CfpTypeBreakdown;
  /** Breakdown by talk level */
  byLevel: CfpLevelBreakdown;
  /** Speaker demographics and geography */
  demographics: CfpDemographics;
  /** Travel and logistics summary */
  logistics: CfpLogistics;
  /** Review activity over time */
  reviewActivity: CfpReviewActivity;
  /** Timeline of submissions */
  submissionTimeline: CfpTimelineEntry[];
  /** Tag popularity */
  topTags: CfpTagCount[];
}

export interface CfpFunnelData {
  draft: number;
  submitted: number;
  under_review: number;
  shortlisted: number;
  accepted: number;
  rejected: number;
  waitlisted: number;
  withdrawn: number;
}

export interface CfpTypeBreakdown {
  lightning: { total: number; accepted: number; avgScore: number | null };
  standard: { total: number; accepted: number; avgScore: number | null };
  workshop: { total: number; accepted: number; avgScore: number | null };
}

export interface CfpLevelBreakdown {
  beginner: { total: number; accepted: number; avgScore: number | null };
  intermediate: { total: number; accepted: number; avgScore: number | null };
  advanced: { total: number; accepted: number; avgScore: number | null };
}

export interface CfpDemographics {
  /** Total unique speakers */
  totalSpeakers: number;
  /** Speakers with complete profiles (bio + image) */
  profileComplete: number;
  /** Speakers with incomplete profiles */
  profileIncomplete: number;
  /** Top countries by speaker count */
  topCountries: Array<{ country: string; count: number }>;
  /** Top companies by speaker count */
  topCompanies: Array<{ company: string; count: number }>;
  /** Speakers interested in sponsoring */
  sponsorInterestCount: number;
  /** Average submissions per speaker */
  avgSubmissionsPerSpeaker: number;
  /** Speakers with multiple submissions */
  multiSubmissionSpeakers: number;
}

export interface CfpLogistics {
  /** Speakers needing travel assistance */
  travelAssistanceNeeded: number;
  /** Breakdown of assistance type */
  assistanceBreakdown: {
    travel: number;
    accommodation: number;
    both: number;
  };
  /** Top departure airports */
  topAirports: Array<{ airport: string; count: number }>;
  /** Speakers with special requirements */
  specialRequirementsCount: number;
}

export interface CfpReviewActivity {
  /** Total reviews */
  totalReviews: number;
  /** Average score across all reviews */
  avgScore: number | null;
  /** Score distribution (1-4 in 0.5 increments) */
  scoreDistribution: Array<{ range: string; count: number }>;
  /** Reviews per day (last 30 days) */
  reviewsPerDay: Array<{ date: string; count: number }>;
  /** Average reviews per submission */
  avgReviewsPerSubmission: number;
  /** Submissions with zero reviews */
  unreviewed: number;
}

export interface CfpTimelineEntry {
  date: string;
  submissions: number;
  cumulative: number;
}

export interface CfpTagCount {
  name: string;
  count: number;
}
