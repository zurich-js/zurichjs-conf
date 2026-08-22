import { z } from 'zod';
import { isMapsUrlWithoutVenue } from '@/lib/program/session-location';

/**
 * Program Schedule Validation Schemas
 * Zod schemas for the admin program-schedule API routes
 * (create/update of schedule slots managed on /admin/speakers → Schedule)
 */

export const PROGRAM_SCHEDULE_ITEM_TYPES = ['session', 'event', 'break', 'placeholder'] as const;

const scheduleItemFields = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'start_time must be HH:MM or HH:MM:SS'),
  duration_minutes: z.number().int().positive('duration_minutes must be a positive integer'),
  room: z.string().max(200, 'room is too long').optional().nullable(),
  location_name: z.string().max(200, 'location_name is too long').optional().nullable(),
  location_address: z.string().max(500, 'location_address is too long').optional().nullable(),
  location_maps_url: z
    .string()
    .url('location_maps_url must be a valid URL')
    .max(2000, 'location_maps_url is too long')
    .optional()
    .nullable(),
  type: z.enum(PROGRAM_SCHEDULE_ITEM_TYPES),
  title: z.string().min(1, 'title is required').max(300, 'title is too long'),
  description: z.string().max(5000, 'description is too long').optional().nullable(),
  session_id: z.string().uuid('session_id must be a UUID').optional().nullable(),
  submission_id: z.string().uuid('submission_id must be a UUID').optional().nullable(),
  is_visible: z.boolean().optional(),
};

/** A maps link without a venue name/address can't be labelled anywhere — reject it. */
function requireVenueWithMapsUrl(
  data: { location_maps_url?: string | null; location_name?: string | null; location_address?: string | null },
  ctx: z.RefinementCtx
) {
  if (isMapsUrlWithoutVenue(data)) {
    ctx.addIssue({
      code: 'custom',
      path: ['location_maps_url'],
      message: 'location_maps_url requires a location_name or location_address',
    });
  }
}

export const createProgramScheduleItemSchema = z
  .object(scheduleItemFields)
  .superRefine(requireVenueWithMapsUrl);

// Deliberately no maps-URL refine here: a partial patch can't see stored
// values (e.g. a maps-URL-only patch is valid when the stored row already has
// a venue). updateProgramScheduleItem validates the merged stored + patched
// state instead.
export const updateProgramScheduleItemSchema = z.object(scheduleItemFields).partial();
