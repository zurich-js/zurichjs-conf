import { z } from 'zod';

/**
 * Attendee information schema
 * Each ticket requires attendee details
 */
export const attendeeInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
});

export type AttendeeInfo = z.infer<typeof attendeeInfoSchema>;

/**
 * Checkout form validation schema
 * Validates customer information for ticket purchases
 */
export const checkoutFormSchema = z.object({
  // Contact Information
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  phone: z.string().optional(),

  // Personal Information
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  company: z.string().min(1, 'Company is required'),
  jobTitle: z.string().min(1, 'Job title is required'),

  // Address Information
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),

  // Terms & Conditions
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
  subscribeNewsletter: z.boolean().optional(),

  // Attendee information for each ticket
  attendees: z.array(attendeeInfoSchema).optional(),
});

export type CheckoutFormData = z.infer<typeof checkoutFormSchema>;
