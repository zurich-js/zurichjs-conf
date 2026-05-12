/**
 * Volunteer Validation Schemas
 * Zod schemas for volunteer roles, applications, and profiles
 */

import { z } from 'zod';
import { normalizeLinkedinUrl } from './cfp';
import {
  VOLUNTEER_ROLE_STATUSES,
  VOLUNTEER_COMMITMENT_TYPES,
  VOLUNTEER_APPLICATION_STATUSES,
  VOLUNTEER_PROFILE_STATUSES,
} from '@/lib/types/volunteer';

// ============================================
// VOLUNTEER APPLICATION (Public Form)
// ============================================

export const volunteerApplicationSchema = z.object({
  role_id: z.string().uuid('Invalid role'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone number is required'),
  linkedin_url: z
    .string()
    .min(1, 'LinkedIn profile is required')
    .transform(normalizeLinkedinUrl)
    .refine((val) => val.includes('linkedin.com'), {
      message: 'Please provide a valid LinkedIn URL',
    }),
  website_url: z
    .string()
    .url('Please provide a valid URL')
    .optional()
    .or(z.literal('')),
  motivation: z
    .string()
    .min(50, 'Please provide at least 50 characters about your motivation')
    .max(2000, 'Motivation is too long'),
  availability: z.string().min(1, 'Availability is required'),
  relevant_experience: z
    .string()
    .min(20, 'Please provide at least 20 characters about your experience')
    .max(2000, 'Experience description is too long'),
  location: z.string().min(1, 'Please let us know where you are based'),
  affiliation: z.string().max(200).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
  commitment_confirmed: z.literal(true, {
    message: 'You must confirm you understand the commitment',
  }),
  exclusions_confirmed: z.literal(true, {
    message: 'You must confirm you understand what is not included',
  }),
  contact_consent_confirmed: z.literal(true, {
    message: 'You must consent to being contacted',
  }),
});

export type VolunteerApplicationFormData = z.infer<typeof volunteerApplicationSchema>;

// ============================================
// VOLUNTEER ROLE (Admin Create/Edit)
// ============================================

export const volunteerRoleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only'),
  summary: z.string().max(500).optional().or(z.literal('')),
  description: z.string().max(5000).optional().or(z.literal('')),
  responsibilities: z.string().max(3000).optional().or(z.literal('')),
  requirements: z.string().max(3000).optional().or(z.literal('')),
  nice_to_haves: z.string().max(3000).optional().or(z.literal('')),
  benefits: z.string().max(3000).optional().or(z.literal('')),
  included_benefits: z.string().max(2000).optional().or(z.literal('')),
  excluded_benefits: z.string().max(2000).optional().or(z.literal('')),
  commitment_type: z.enum(VOLUNTEER_COMMITMENT_TYPES),
  availability_requirements: z.string().max(1000).optional().or(z.literal('')),
  location_context: z.string().max(500).optional().or(z.literal('')),
  spots_available: z.number().int().min(1).optional().nullable(),
  show_spots_publicly: z.boolean().optional(),
  application_deadline: z.string().optional().or(z.literal('')),
  status: z.enum(VOLUNTEER_ROLE_STATUSES).optional(),
  is_public: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
  internal_notes: z.string().max(2000).optional().or(z.literal('')),
});

export type VolunteerRoleFormData = z.infer<typeof volunteerRoleSchema>;

// ============================================
// APPLICATION STATUS CHANGE (Admin)
// ============================================

export const volunteerApplicationStatusSchema = z.object({
  status: z.enum(VOLUNTEER_APPLICATION_STATUSES),
  internal_notes: z.string().max(2000).optional().or(z.literal('')),
});

export type VolunteerApplicationStatusData = z.infer<typeof volunteerApplicationStatusSchema>;

// ============================================
// VOLUNTEER PROFILE (Admin Create/Edit)
// ============================================

export const volunteerProfileSchema = z.object({
  application_id: z.string().uuid().optional().nullable(),
  role_id: z.string().uuid().optional().nullable(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional().or(z.literal('')),
  linkedin_url: z.string().optional().or(z.literal('')),
  responsibilities: z.string().max(3000).optional().or(z.literal('')),
  internal_contact: z.string().max(200).optional().or(z.literal('')),
  availability: z.string().max(1000).optional().or(z.literal('')),
  status: z.enum(VOLUNTEER_PROFILE_STATUSES).optional(),
  is_public: z.boolean().optional(),
  public_bio: z.string().max(1000).optional().or(z.literal('')),
  photo_url: z.string().url().optional().or(z.literal('')),
});

export type VolunteerProfileFormData = z.infer<typeof volunteerProfileSchema>;
