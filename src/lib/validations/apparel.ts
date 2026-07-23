import { z } from 'zod';
import { APPAREL_SIZES } from '@/lib/types/ticket-constants';

/**
 * Apparel Preferences Validation Schemas
 * Zod schemas for ticket holder apparel size preferences
 */

/**
 * Ticket holder apparel preferences (manage-ticket flow).
 * Hoodie size is only accepted for VIP tickets — enforced in the API handler,
 * since ticket category is not part of the request body.
 */
export const apparelPreferencesSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  tshirtSize: z.enum(APPAREL_SIZES).nullable(),
  hoodieSize: z.enum(APPAREL_SIZES).nullable().optional(),
});

export type ApparelPreferencesInput = z.infer<typeof apparelPreferencesSchema>;
