/**
 * Shared validation + business rules for the admin workshops API.
 * Zod schemas for request bodies, status-transition guards, and an audit
 * helper used by all destructive mutations.
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';
import type { WorkshopStatus } from '@/lib/types/database';
import type { AdminAccessResult } from '@/lib/admin/auth';

const log = logger.scope('Admin Workshops Audit');

export const WORKSHOP_STATUSES: readonly WorkshopStatus[] = [
  'draft',
  'published',
  'cancelled',
  'completed',
  'archived',
];

/** Allowed state transitions. Keys are the current status. */
export const ALLOWED_STATUS_TRANSITIONS: Record<WorkshopStatus, WorkshopStatus[]> = {
  draft: ['published', 'cancelled', 'archived'],
  published: ['completed', 'cancelled', 'archived'],
  cancelled: ['draft', 'archived'],
  completed: ['archived'],
  archived: ['draft'],
};

export function canTransition(from: WorkshopStatus, to: WorkshopStatus): boolean {
  if (from === to) return true;
  return ALLOWED_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
  .nullable();

const timeString = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'time must be HH:MM')
  .nullable();

/** Schema for POST /api/admin/workshops — create a new offering. */
export const CreateOfferingSchema = z.object({
  cfpSubmissionId: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  room: z.string().nullable().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
  stripeProductId: z.string().nullable().optional(),
  stripePriceLookupKey: z.string().nullable().optional(),
  status: z.enum(['draft', 'published', 'cancelled', 'completed', 'archived']).optional(),
});
export type CreateOfferingInput = z.infer<typeof CreateOfferingSchema>;

/** Schema for PATCH /api/admin/workshops/:id — partial update. */
export const PatchOfferingSchema = z
  .object({
    room: z.string().nullable().optional(),
    capacity: z.number().int().positive().optional(),
    stripeProductId: z.string().nullable().optional(),
    stripePriceLookupKey: z.string().nullable().optional(),
    stripeValidation: z
      .object({
        valid: z.boolean(),
        lookupKey: z.string(),
        stripeProductId: z.string().nullable(),
        validatedAt: z.string(),
        results: z.array(z.record(z.string(), z.unknown())),
      })
      .optional(),
    status: z.enum(['draft', 'published', 'cancelled', 'completed', 'archived']).optional(),
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    date: dateString.optional(),
    startTime: timeString.optional(),
    endTime: timeString.optional(),
  })
  .refine(
    (value) => Object.values(value).some((v) => v !== undefined),
    { message: 'At least one field must be provided.' }
  );
export type PatchOfferingInput = z.infer<typeof PatchOfferingSchema>;

/** Schema for POST /api/admin/workshops/validate-stripe. */
export const ValidateStripeSchema = z.object({
  lookupKey: z.string().min(1),
  stripeProductId: z.string().nullable().optional(),
});
export type ValidateStripeInput = z.infer<typeof ValidateStripeSchema>;

interface AuditInput {
  access: AdminAccessResult;
  action: string;
  workshopId?: string | null;
  cfpSubmissionId?: string | null;
  before?: unknown;
  after?: unknown;
  details?: Record<string, unknown>;
}

/**
 * Persist an audit log entry for admin mutations. Writes to the structured
 * logger so the ops pipeline catches it; no DB table needed for now.
 */
export function auditAdminWorkshopMutation(input: AuditInput): void {
  const actor = input.access.isBot
    ? `bot:${input.access.botClient ?? 'unknown'}`
    : 'admin:cookie';

  log.info(input.action, {
    actor,
    workshopId: input.workshopId ?? null,
    cfpSubmissionId: input.cfpSubmissionId ?? null,
    before: input.before,
    after: input.after,
    details: input.details,
  });
}
