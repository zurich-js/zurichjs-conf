import { z } from 'zod';
import { APPAREL_SIZES } from '@/lib/types/ticket-constants';

/**
 * Attendee information schema
 * Each ticket requires attendee details. Apparel sizes are always optional in
 * the purchase path: holders who skip them pick sizes post-purchase via the
 * manage-order link (`/api/tickets/[id]/apparel`), backed by the admin
 * apparel reminder flow.
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
  tshirtSize: z.enum(APPAREL_SIZES).optional(),
  hoodieSize: z.enum(APPAREL_SIZES).optional(),
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

  // Personal Information — company and job title are marketing data, not
  // payment requirements, so they must never block a purchase.
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  company: z.string().optional(),
  jobTitle: z.string().optional(),

  // Address Information
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),

  // Apparel — collected here only when the attendee step is skipped (single
  // seat per line), where the billing contact is the sole ticket holder.
  // Always optional: sizes can be set post-purchase via manage-order.
  tshirtSize: z.enum(APPAREL_SIZES).optional(),
  hoodieSize: z.enum(APPAREL_SIZES).optional(),

  // Terms & Conditions
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
  subscribeNewsletter: z.boolean().optional(),

  // Attendee information for each ticket
  attendees: z.array(attendeeInfoSchema).optional(),

  // Per-workshop attendees, keyed by workshopId (workshops support multi-seat
  // purchase like tickets). Array ordered by seat_index.
  workshopAttendees: z.record(z.string(), z.array(attendeeInfoSchema)).optional(),
});

export type CheckoutFormData = z.infer<typeof checkoutFormSchema>;
