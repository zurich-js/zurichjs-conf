import { z } from 'zod';

const urlField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(500, `${label} must be 500 characters or less`)
    .url(`Enter a valid ${label.toLowerCase()} URL`);

export const namespaceStudentSponsorshipSchema = z.object({
  applicationId: z.uuid().optional().or(z.literal('')),
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
  processingConsent: z
    .boolean()
    .refine((value) => value, {
      message: 'Confirm that ZurichJS may process and share your application with Namespace',
    }),
  website: z.string().max(200, 'Invalid submission').optional(),
  posthogSessionId: z.string().max(500).optional(),
  posthogDistinctId: z.string().max(500).optional(),
});

const optionalUrlField = (label: string) =>
  z
    .string()
    .trim()
    .max(500, `${label} must be 500 characters or less`)
    .url(`Enter a valid ${label.toLowerCase()} URL`)
    .optional()
    .or(z.literal(''));

const optionalTextField = (label: string, maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, `${label} must be ${maxLength} characters or less`)
    .optional()
    .or(z.literal(''));

export const namespaceStudentSponsorshipLeadSchema = z.object({
  applicationId: z.uuid().optional().or(z.literal('')),
  email: namespaceStudentSponsorshipSchema.shape.email,
  fullName: optionalTextField('Full name', 100),
  universityName: optionalTextField('University name', 160),
  degreeName: optionalTextField('Degree name', 160),
  githubUrl: optionalUrlField('GitHub page'),
  codeUrl: optionalUrlField('Code link'),
  setupInstructions: optionalTextField('Setup instructions', 4000),
  prideExplanation: optionalTextField('Explanation', 3000),
  anythingElse: optionalTextField('Additional notes', 2000),
  processingConsent: namespaceStudentSponsorshipSchema.shape.processingConsent,
  posthogSessionId: z.string().max(500).optional(),
  posthogDistinctId: z.string().max(500).optional(),
});

export type NamespaceStudentSponsorshipFormData = z.infer<
  typeof namespaceStudentSponsorshipSchema
>;

export type NamespaceStudentSponsorshipLeadData = z.infer<
  typeof namespaceStudentSponsorshipLeadSchema
>;
