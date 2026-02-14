/**
 * Issue Report Validation Schema
 * Zod schema for validating issue report form submissions
 */

import { z } from 'zod';

/**
 * Valid issue types that can be reported
 */
export const ISSUE_TYPES = [
  { value: 'typo', label: 'Typo' },
  { value: 'broken_link', label: 'Broken link' },
  { value: 'incorrect_info', label: 'Incorrect information' },
  { value: 'ui_bug', label: 'UI bug' },
  { value: 'mobile_issue', label: 'Mobile display issue' },
  { value: 'accessibility', label: 'Accessibility issue' },
  { value: 'missing_content', label: 'Missing content' },
  { value: 'confusing_ux', label: 'Confusing UX' },
  { value: 'performance', label: 'Performance issue' },
  { value: 'other', label: 'Other' },
] as const;

export type IssueType = (typeof ISSUE_TYPES)[number]['value'];

/**
 * Issue report form validation schema
 */
export const issueReportSchema = z.object({
  // Reporter info
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),

  // Issue details
  issueType: z.enum([
    'typo',
    'broken_link',
    'incorrect_info',
    'ui_bug',
    'mobile_issue',
    'accessibility',
    'missing_content',
    'confusing_ux',
    'performance',
    'other',
  ]),
  pageUrl: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be 2000 characters or less'),

  // Optional additional info
  suggestedFix: z
    .string()
    .max(1000, 'Suggested fix must be 1000 characters or less')
    .optional(),
  screenshotUrl: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),

  // Reward preference (required)
  rewardPreference: z.enum(['ticket_discount', 'workshop_voucher', 'no_reward'], {
    message: 'Please select a reward preference',
  }),

  // Honeypot field - should be empty for legitimate submissions
  website: z.string().max(0, 'Invalid submission').optional(),

  // PostHog tracking (optional, captured client-side)
  posthogSessionId: z.string().optional(),
  posthogDistinctId: z.string().optional(),
});

export type RewardPreference = 'ticket_discount' | 'workshop_voucher' | 'no_reward';

export const REWARD_PREFERENCE_LABELS: Record<RewardPreference, string> = {
  ticket_discount: 'Conference ticket discount',
  workshop_voucher: 'Workshop voucher',
  no_reward: 'No reward needed',
};

/**
 * Type inferred from the schema
 */
export type IssueReportFormData = z.infer<typeof issueReportSchema>;

/**
 * Get human-readable label for an issue type
 */
export function getIssueTypeLabel(type: IssueType): string {
  const issueType = ISSUE_TYPES.find((t) => t.value === type);
  return issueType?.label ?? type;
}
