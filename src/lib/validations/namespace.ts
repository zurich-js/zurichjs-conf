import { z } from 'zod';

const urlField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(500, `${label} must be 500 characters or less`)
    .url(`Enter a valid ${label.toLowerCase()} URL`);

export const namespaceStudentSponsorshipSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(100, 'Full name must be 100 characters or less'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address')
    .max(254, 'Email must be 254 characters or less'),
  universityName: z
    .string()
    .trim()
    .min(1, 'University name is required')
    .max(160, 'University name must be 160 characters or less'),
  degreeName: z
    .string()
    .trim()
    .min(1, 'Degree name is required')
    .max(160, 'Degree name must be 160 characters or less'),
  githubUrl: urlField('GitHub page'),
  codeUrl: urlField('Code link'),
  setupInstructions: z
    .string()
    .trim()
    .min(20, 'Setup instructions must be at least 20 characters')
    .max(4000, 'Setup instructions must be 4000 characters or less'),
  prideExplanation: z
    .string()
    .trim()
    .min(20, 'Explanation must be at least 20 characters')
    .max(3000, 'Explanation must be 3000 characters or less'),
  anythingElse: z
    .string()
    .trim()
    .max(2000, 'Additional notes must be 2000 characters or less')
    .optional(),
  eligibilityConfirmed: z
    .boolean()
    .refine((value) => value, {
      message: 'Confirm that you are eligible for the student sponsorship',
    }),
  website: z.string().max(200, 'Invalid submission').optional(),
  posthogSessionId: z.string().max(500).optional(),
  posthogDistinctId: z.string().max(500).optional(),
});

export type NamespaceStudentSponsorshipFormData = z.infer<
  typeof namespaceStudentSponsorshipSchema
>;
