/**
 * CFP Hooks
 * Barrel export for all CFP-related hooks
 */

// Speaker hooks
export { useCfpSpeaker, useUpdateSpeaker } from './speaker';

// Submission hooks
export {
  useCfpSubmissions,
  useCfpSubmission,
  useCreateSubmission,
  useUpdateSubmission,
  useSubmitForReview,
  useWithdrawSubmission,
  useDeleteSubmission,
  useCfpSuggestedTags,
} from './submissions';

// Travel hooks
export {
  useCfpTravel,
  useUpdateTravel,
  useCfpFlights,
  useSaveFlight,
  useDeleteFlight,
  useCfpReimbursements,
  useSubmitReimbursement,
} from './travel';

// Reviewer hooks
export {
  useCfpReviewerDashboard,
  useCfpReviewerSubmission,
  useSubmitReview,
} from './reviewer';

// Types
export type { ReviewerDashboardData, ReviewerSubmissionData } from './reviewer';
