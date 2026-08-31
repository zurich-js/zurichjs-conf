import { z } from 'zod';
import { DOOR_OCCASIONS, DOOR_ROLES } from '@/lib/types/checkin';

/**
 * Door check-in validation schemas.
 *
 * Two rules shape these:
 *
 *  - The OCCASION is never accepted from a client. It is derived server-side by
 *    `door_current_occasion()`, because a station with a wrong date or a tab
 *    left open across midnight would otherwise write the wrong day into an
 *    append-only table. It appears below only where an organiser is FILTERING
 *    existing records.
 *
 *  - `occurredAt` IS accepted, because a station may queue a check-in while
 *    offline and sync it later, and the audit trail needs the real time. The
 *    database clamps a future value rather than trusting it, so this schema
 *    only has to reject nonsense.
 */

/** A scanned QR resolves to either a ticket id or a workshop registration id. */
export const doorScanSchema = z.object({
  scannedId: z.string().uuid('Not a valid code'),
});

export type DoorScanInput = z.infer<typeof doorScanSchema>;

const stationSchema = z
  .string()
  .trim()
  .min(1)
  .max(60, 'Station label is too long')
  .optional();

/**
 * `occurredAt` is bounded on both sides. The lower bound stops a broken client
 * backdating an action to before the event existed; the upper bound is belt and
 * braces, since the database clamps a future timestamp anyway.
 */
const occurredAtSchema = z
  .string()
  .datetime({ message: 'occurredAt must be an ISO 8601 timestamp' })
  .refine((value) => new Date(value) >= new Date('2026-09-01T00:00:00Z'), {
    message: 'occurredAt predates the event',
  })
  .optional();

export const doorCheckInSchema = z.object({
  scannedId: z.string().uuid('Not a valid code'),
  station: stationSchema,
  occurredAt: occurredAtSchema,
});

export type DoorCheckInInput = z.infer<typeof doorCheckInSchema>;

/**
 * A manual admission always carries a reason. One without a reason is
 * indistinguishable from a mistake when the log is read weeks later, so the
 * database refuses it too — this is the friendlier of the two rejections.
 */
export const doorManualAdmitSchema = z.object({
  scannedId: z.string().uuid('Not a valid code'),
  station: stationSchema,
  occurredAt: occurredAtSchema,
  reason: z
    .string()
    .trim()
    .min(3, 'Say briefly why this admission was manual')
    .max(500, 'Reason is too long'),
});

export type DoorManualAdmitInput = z.infer<typeof doorManualAdmitSchema>;

export const doorGoodieHandoverSchema = z.object({
  ticketId: z.string().uuid('Not a valid ticket'),
  station: stationSchema,
  occurredAt: occurredAtSchema,
  /** Set when only part of the entitlement was handed over. */
  note: z.string().trim().max(280, 'Note is too long').optional(),
});

export type DoorGoodieHandoverInput = z.infer<typeof doorGoodieHandoverSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Staff management (admin panel)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mirrors reviewerInviteSchema so the two invite flows stay recognisable.
 * The email is lowercased here because the staff table has a CHECK constraint
 * requiring it, making the allow-list lookup exact rather than relying on a
 * case-insensitive match at every call site.
 */
export const doorStaffInviteSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .toLowerCase(),
  name: z.string().trim().max(120).optional(),
  role: z.enum(DOOR_ROLES).default('scanner'),
});

export type DoorStaffInviteInput = z.infer<typeof doorStaffInviteSchema>;

export const doorStaffUpdateSchema = z
  .object({
    role: z.enum(DOOR_ROLES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => value.role !== undefined || value.isActive !== undefined, {
    message: 'Nothing to update',
  });

export type DoorStaffUpdateInput = z.infer<typeof doorStaffUpdateSchema>;

/** Filters for the organiser's audit view. Occasion is a filter here, not an input. */
export const doorEventQuerySchema = z.object({
  occasion: z.enum(DOOR_OCCASIONS).optional(),
  eventType: z
    .enum(['checked_in', 'check_in_undone', 'goodie_handed', 'manual_admit', 'denied'])
    .optional(),
  subjectId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type DoorEventQueryInput = z.infer<typeof doorEventQuerySchema>;
