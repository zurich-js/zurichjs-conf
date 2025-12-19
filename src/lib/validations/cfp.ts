import { z } from 'zod';

/**
 * CFP Validation Schemas
 * Zod schemas for validating CFP form data
 */

// ============================================
// HELPERS
// ============================================

/**
 * Count words in a string
 */
const wordCount = (text: string): number =>
  text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

// ============================================
// SPEAKER PROFILE
// ============================================

/**
 * Available t-shirt sizes
 */
export const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;

/**
 * Speaker profile validation schema
 */
export const speakerProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  job_title: z.string().optional(),
  company: z.string().optional(),
  bio: z
    .string()
    .max(2000, 'Bio is too long')
    .refine((val) => !val || wordCount(val) <= 250, {
      message: 'Bio must be 250 words or less',
    })
    .optional(),
  linkedin_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  github_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  twitter_handle: z.string().optional(),
  bluesky_handle: z.string().optional(),
  mastodon_handle: z.string().optional(),
  tshirt_size: z.enum(TSHIRT_SIZES).optional().nullable(),
  company_interested_in_sponsoring: z.boolean().optional().nullable(),
});

export type SpeakerProfileFormData = z.infer<typeof speakerProfileSchema>;

// ============================================
// SUBMISSIONS
// ============================================

/**
 * Base submission schema (common fields for all types)
 */
const baseSubmissionSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  abstract: z
    .string()
    .min(100, 'Abstract must be at least 100 characters')
    .max(3000, 'Abstract is too long'),
  submission_type: z.enum(['lightning', 'standard', 'workshop']),
  talk_level: z.enum(['beginner', 'intermediate', 'advanced']),
  tags: z
    .array(z.string())
    .min(1, 'At least one tag is required')
    .max(5, 'Maximum 5 tags allowed'),
  additional_notes: z.string().max(2000, 'Notes are too long').optional(),
  outline: z.string().max(5000, 'Outline is too long').optional(),
  slides_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  previous_recording_url: z
    .string()
    .url('Invalid URL')
    .optional()
    .or(z.literal('')),
  travel_assistance_required: z.boolean(),
  company_can_cover_travel: z.boolean(),
  special_requirements: z
    .string()
    .max(1000, 'Requirements text is too long')
    .optional(),
});

/**
 * Workshop-specific fields
 */
const workshopFieldsSchema = z.object({
  workshop_duration_hours: z
    .number()
    .int('Duration must be a whole number')
    .min(2, 'Minimum duration is 2 hours')
    .max(8, 'Maximum duration is 8 hours'),
  workshop_expected_compensation: z.string().optional(),
  workshop_compensation_amount: z.number().optional(),
  workshop_special_requirements: z
    .string()
    .max(2000, 'Requirements are too long')
    .optional(),
  workshop_max_participants: z
    .number()
    .int()
    .min(5, 'Minimum 5 participants')
    .max(100, 'Maximum 100 participants')
    .optional(),
});

/**
 * Talk submission schema (lightning or standard)
 */
export const talkSubmissionSchema = baseSubmissionSchema.extend({
  submission_type: z.enum(['lightning', 'standard']),
});

export type TalkSubmissionFormData = z.infer<typeof talkSubmissionSchema>;

/**
 * Workshop submission schema
 */
export const workshopSubmissionSchema = baseSubmissionSchema
  .extend({
    submission_type: z.literal('workshop'),
  })
  .merge(workshopFieldsSchema);

export type WorkshopSubmissionFormData = z.infer<
  typeof workshopSubmissionSchema
>;

/**
 * Unified submission schema using discriminated union
 */
export const submissionSchema = z.discriminatedUnion('submission_type', [
  talkSubmissionSchema,
  workshopSubmissionSchema,
]);

export type SubmissionFormData = z.infer<typeof submissionSchema>;

/**
 * Update submission schema (partial, for editing)
 */
export const updateSubmissionSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').optional(),
  abstract: z
    .string()
    .min(100, 'Abstract must be at least 100 characters')
    .max(3000, 'Abstract is too long')
    .optional(),
  talk_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  tags: z
    .array(z.string())
    .min(1, 'At least one tag is required')
    .max(5, 'Maximum 5 tags allowed')
    .optional(),
  additional_notes: z.string().max(2000).optional(),
  outline: z.string().max(5000).optional(),
  slides_url: z.string().url().optional().or(z.literal('')),
  previous_recording_url: z.string().url().optional().or(z.literal('')),
  travel_assistance_required: z.boolean().optional(),
  company_can_cover_travel: z.boolean().optional(),
  special_requirements: z.string().max(1000).optional(),
  // Workshop fields
  workshop_duration_hours: z.number().int().min(2).max(8).optional(),
  workshop_expected_compensation: z.string().optional(),
  workshop_compensation_amount: z.number().optional(),
  workshop_special_requirements: z.string().max(2000).optional(),
  workshop_max_participants: z.number().int().min(5).max(100).optional(),
});

export type UpdateSubmissionFormData = z.infer<typeof updateSubmissionSchema>;

// ============================================
// REVIEWS
// ============================================

/**
 * Review submission schema
 */
export const reviewSchema = z.object({
  score_overall: z
    .number()
    .int('Score must be a whole number')
    .min(1, 'Minimum score is 1')
    .max(5, 'Maximum score is 5'),
  score_relevance: z.number().int().min(1).max(5).optional(),
  score_technical_depth: z.number().int().min(1).max(5).optional(),
  score_clarity: z.number().int().min(1).max(5).optional(),
  score_diversity: z.number().int().min(1).max(5).optional(),
  private_notes: z.string().max(5000, 'Notes are too long').optional(),
  feedback_to_speaker: z.string().max(2000, 'Feedback is too long').optional(),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;

// ============================================
// TRAVEL
// ============================================

/**
 * Speaker travel details schema
 */
export const speakerTravelSchema = z.object({
  arrival_date: z.string().optional(),
  departure_date: z.string().optional(),
  attending_speakers_dinner: z.boolean().optional(),
  attending_speakers_activities: z.boolean().optional(),
  dietary_restrictions: z
    .string()
    .max(500, 'Text is too long')
    .optional(),
  accessibility_needs: z
    .string()
    .max(1000, 'Text is too long')
    .optional(),
});

export type SpeakerTravelFormData = z.infer<typeof speakerTravelSchema>;

/**
 * Flight details schema
 */
export const flightSchema = z.object({
  direction: z.enum(['inbound', 'outbound']),
  airline: z.string().min(1, 'Airline is required'),
  flight_number: z.string().min(1, 'Flight number is required'),
  departure_airport: z
    .string()
    .min(3, 'Airport code must be 3-4 characters')
    .max(4, 'Airport code must be 3-4 characters'),
  arrival_airport: z
    .string()
    .min(3, 'Airport code must be 3-4 characters')
    .max(4, 'Airport code must be 3-4 characters'),
  departure_time: z.string().min(1, 'Departure time is required'),
  arrival_time: z.string().min(1, 'Arrival time is required'),
  booking_reference: z.string().optional(),
  cost_amount: z.number().optional(),
  cost_currency: z.string().default('CHF'),
});

export type FlightFormData = z.infer<typeof flightSchema>;

/**
 * Reimbursement request schema
 */
export const reimbursementSchema = z.object({
  expense_type: z.enum(['flight', 'accommodation', 'transport', 'other']),
  description: z.string().min(5, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('CHF'),
  bank_name: z.string().optional(),
  bank_account_holder: z.string().optional(),
  iban: z.string().optional(),
  swift_bic: z.string().optional(),
});

export type ReimbursementFormData = z.infer<typeof reimbursementSchema>;

// ============================================
// REVIEWER MANAGEMENT
// ============================================

/**
 * Reviewer invite schema
 */
export const reviewerInviteSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  name: z.string().optional(),
  role: z.enum(['reviewer', 'readonly']).default('reviewer'),
  can_see_speaker_identity: z.boolean().default(false),
});

export type ReviewerInviteFormData = z.infer<typeof reviewerInviteSchema>;

// ============================================
// LOGIN
// ============================================

/**
 * CFP login schema (magic link)
 */
export const cfpLoginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

export type CfpLoginFormData = z.infer<typeof cfpLoginSchema>;

// ============================================
// ADMIN CONFIG
// ============================================

/**
 * CFP status config schema
 */
export const cfpStatusConfigSchema = z.object({
  enabled: z.boolean(),
  open_date: z.string().nullable(),
  close_date: z.string().nullable(),
});

export type CfpStatusConfigFormData = z.infer<typeof cfpStatusConfigSchema>;

/**
 * Update submission status schema
 */
export const updateSubmissionStatusSchema = z.object({
  status: z.enum([
    'draft',
    'submitted',
    'under_review',
    'waitlisted',
    'accepted',
    'rejected',
    'withdrawn',
  ]),
});

export type UpdateSubmissionStatusFormData = z.infer<
  typeof updateSubmissionStatusSchema
>;

/**
 * Admin set flight budget schema
 */
export const setFlightBudgetSchema = z.object({
  flight_budget_amount: z.number().min(0, 'Budget must be non-negative'),
  flight_budget_currency: z.string().default('CHF'),
});

export type SetFlightBudgetFormData = z.infer<typeof setFlightBudgetSchema>;

/**
 * Admin update reimbursement status schema
 */
export const updateReimbursementStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'paid']),
  admin_notes: z.string().optional(),
});

export type UpdateReimbursementStatusFormData = z.infer<
  typeof updateReimbursementStatusSchema
>;
