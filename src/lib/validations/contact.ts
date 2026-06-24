/**
 * Contact Message Validation Schema
 * Zod schema for validating general contact form submissions (inquiries & feedback)
 */

import { z } from 'zod';

/**
 * Valid contact message types
 */
export const CONTACT_TYPES = [
  { value: 'inquiry', label: 'General inquiry' },
  { value: 'feedback', label: 'Feedback' },
] as const;

export type ContactType = (typeof CONTACT_TYPES)[number]['value'];

/**
 * Contact form validation schema
 */
export const contactMessageSchema = z.object({
  // Sender info
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),

  // Message details
  contactType: z.enum(['inquiry', 'feedback']),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message must be 2000 characters or less'),

  // Honeypot field - should be empty for legitimate submissions
  website: z.string().max(0, 'Invalid submission').optional(),

  // PostHog tracking (optional, captured client-side)
  posthogSessionId: z.string().optional(),
  posthogDistinctId: z.string().optional(),
});

/**
 * Type inferred from the schema
 */
export type ContactMessageFormData = z.infer<typeof contactMessageSchema>;

/**
 * Get human-readable label for a contact type
 */
export function getContactTypeLabel(type: ContactType): string {
  const contactType = CONTACT_TYPES.find((t) => t.value === type);
  return contactType?.label ?? type;
}
