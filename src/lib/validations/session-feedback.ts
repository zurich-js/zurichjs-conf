import { z } from 'zod';

/**
 * Attendee feedback on a scheduled session, posted anonymously from /schedule.
 *
 * `clientId` is the browser's random id (see `@/lib/feedback/storage`). It is
 * bounded and character-restricted so it can only ever be an opaque token —
 * never an email or free text someone could smuggle into the database.
 */
export const sessionFeedbackSchema = z.object({
  scheduleItemId: z.string().uuid(),
  clientId: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/, 'Invalid client id'),
  rating: z.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(2000, 'Comments are limited to 2000 characters')
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type SessionFeedbackPayload = z.infer<typeof sessionFeedbackSchema>;
