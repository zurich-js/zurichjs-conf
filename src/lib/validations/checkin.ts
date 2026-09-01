import { z } from 'zod';
import { DOOR_OCCASIONS, DOOR_ROLES } from '@/lib/types/checkin';

/**
 * Door check-in validation schemas.
 *
 * Two rules shape these:
 *
 *  - The OCCASION is a deliberate staff choice, validated against the two known
 *    values — the volunteer picks which day they are checking people in FOR on
 *    the start screen (badges are picked up and workshops rehearsed on other
 *    days). It is never a free-text client claim: anything outside the enum is
 *    rejected here, and the database falls back to its own clock for a missing
 *    value, so a device with a wrong date still cannot write an unknown day
 *    into an append-only table.
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

/** The staff-chosen day. Optional: omitted means "whatever the server clock says". */
const occasionSchema = z.enum(DOOR_OCCASIONS).optional();

/** Validates an occasion from a query parameter (string or undefined). */
export const occasionQuerySchema = z
  .string()
  .optional()
  .transform((value) =>
    value && (DOOR_OCCASIONS as readonly string[]).includes(value)
      ? (value as (typeof DOOR_OCCASIONS)[number])
      : undefined
  );

export const doorCheckInSchema = z.object({
  scannedId: z.string().uuid('Not a valid code'),
  station: stationSchema,
  occurredAt: occurredAtSchema,
  occasion: occasionSchema,
});

export type DoorCheckInInput = z.infer<typeof doorCheckInSchema>;

/**
 * Undoing a mistaken check-in. The reason is optional — unlike a manual
 * admission, the common case ("scanned the wrong badge of a pair") is obvious
 * from the adjacent audit rows — but it is stored when given.
 */
export const doorCheckInUndoSchema = z.object({
  scannedId: z.string().uuid('Not a valid code'),
  station: stationSchema,
  occurredAt: occurredAtSchema,
  occasion: occasionSchema,
  reason: z.string().trim().max(500, 'Reason is too long').optional(),
});

export type DoorCheckInUndoInput = z.infer<typeof doorCheckInUndoSchema>;

/** Recording a badge handover — early pickup included. Never moves check-in state. */
export const doorBadgePickupSchema = z.object({
  scannedId: z.string().uuid('Not a valid code'),
  station: stationSchema,
  occurredAt: occurredAtSchema,
  occasion: occasionSchema,
});

export type DoorBadgePickupInput = z.infer<typeof doorBadgePickupSchema>;

/**
 * A manual admission always carries a reason. One without a reason is
 * indistinguishable from a mistake when the log is read weeks later, so the
 * database refuses it too — this is the friendlier of the two rejections.
 */
export const doorManualAdmitSchema = z.object({
  scannedId: z.string().uuid('Not a valid code'),
  station: stationSchema,
  occurredAt: occurredAtSchema,
  occasion: occasionSchema,
  reason: z
    .string()
    .trim()
    .min(3, 'Say briefly why this admission was manual')
    .max(500, 'Reason is too long'),
});

export type DoorManualAdmitInput = z.infer<typeof doorManualAdmitSchema>;

/** A handed size, e.g. "M". Free-ish text: the apparel preferences are too. */
const handedSizeSchema = z.string().trim().min(1).max(12, 'Size is too long').optional();

export const doorGoodieHandoverSchema = z.object({
  ticketId: z.string().uuid('Not a valid ticket'),
  station: stationSchema,
  occurredAt: occurredAtSchema,
  occasion: occasionSchema,
  /** Set when only part of the entitlement was handed over. */
  note: z.string().trim().max(280, 'Note is too long').optional(),
  /** Size actually handed over. Omitted = the t-shirt was NOT handed. */
  tshirtSize: handedSizeSchema,
  /** Size actually handed over. Omitted = the hoodie was NOT handed. */
  hoodieSize: handedSizeSchema,
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
    .enum([
      'checked_in',
      'check_in_undone',
      'goodie_handed',
      'manual_admit',
      'badge_pickup',
      'denied',
    ])
    .optional(),
  subjectId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type DoorEventQueryInput = z.infer<typeof doorEventQuerySchema>;
