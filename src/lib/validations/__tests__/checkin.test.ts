import { describe, it, expect } from 'vitest';
import {
  doorBadgePickupSchema,
  doorCheckInSchema,
  doorCheckInUndoSchema,
  doorEventQuerySchema,
  doorGoodieHandoverSchema,
  doorManualAdmitSchema,
  doorScanSchema,
  doorStaffInviteSchema,
  doorStaffUpdateSchema,
} from '../checkin';

const UUID = 'a1b2c3d4-e5f6-4789-8abc-def012345678';

describe('doorScanSchema', () => {
  it('accepts a UUID', () => {
    expect(doorScanSchema.safeParse({ scannedId: UUID }).success).toBe(true);
  });

  it.each([
    ['a bare word', 'not-a-uuid'],
    ['a full validate URL rather than the id', `https://x.com/validate/${UUID}`],
    ['an empty string', ''],
  ])('rejects %s', (_label, scannedId) => {
    expect(doorScanSchema.safeParse({ scannedId }).success).toBe(false);
  });
});

describe('doorCheckInSchema', () => {
  it('accepts the minimum: just a scanned id', () => {
    expect(doorCheckInSchema.safeParse({ scannedId: UUID }).success).toBe(true);
  });

  // The occasion is a deliberate staff choice now (badges are picked up and
  // workshops rehearsed on other days) — but only the two known values pass.
  // Free text can never reach the audit table.
  it('accepts a known occasion as an explicit staff choice', () => {
    const result = doorCheckInSchema.safeParse({ scannedId: UUID, occasion: 'workshop_day' });
    expect(result.success && result.data.occasion).toBe('workshop_day');
  });

  it('rejects an occasion outside the two known days', () => {
    expect(
      doorCheckInSchema.safeParse({ scannedId: UUID, occasion: 'community_day' }).success,
    ).toBe(false);
  });

  it('still works with no occasion at all — the server clock decides', () => {
    const result = doorCheckInSchema.safeParse({ scannedId: UUID });
    expect(result.success && result.data.occasion).toBeUndefined();
  });

  it('accepts an offline occurredAt, because queued scans keep their real time', () => {
    const result = doorCheckInSchema.safeParse({
      scannedId: UUID,
      occurredAt: '2026-09-10T08:31:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an obviously broken occurredAt — the sanity bound, not the event date', () => {
    // SQL clamps dates predating the event to NOW(), so Zod only rejects
    // clearly malformed data (year 2000 or earlier).
    const result = doorCheckInSchema.safeParse({
      scannedId: UUID,
      occurredAt: '1990-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-ISO occurredAt', () => {
    expect(
      doorCheckInSchema.safeParse({ scannedId: UUID, occurredAt: '10 Sep 2026' }).success,
    ).toBe(false);
  });

  it('rejects an over-long station label', () => {
    expect(
      doorCheckInSchema.safeParse({ scannedId: UUID, station: 'x'.repeat(61) }).success,
    ).toBe(false);
  });

  it('trims a station label', () => {
    const result = doorCheckInSchema.safeParse({ scannedId: UUID, station: '  lane-2  ' });
    expect(result.success && result.data.station).toBe('lane-2');
  });
});

describe('doorManualAdmitSchema', () => {
  it('requires a reason', () => {
    expect(doorManualAdmitSchema.safeParse({ scannedId: UUID }).success).toBe(false);
  });

  it('rejects a reason that says nothing', () => {
    expect(doorManualAdmitSchema.safeParse({ scannedId: UUID, reason: 'x' }).success).toBe(false);
    expect(doorManualAdmitSchema.safeParse({ scannedId: UUID, reason: '   ' }).success).toBe(false);
  });

  it('accepts a real reason', () => {
    const result = doorManualAdmitSchema.safeParse({
      scannedId: UUID,
      reason: 'Blank badge, phone dead, found by name',
    });
    expect(result.success).toBe(true);
  });
});

describe('doorGoodieHandoverSchema', () => {
  it('accepts a ticket id alone', () => {
    expect(doorGoodieHandoverSchema.safeParse({ ticketId: UUID }).success).toBe(true);
  });

  it('accepts a partial-handover note', () => {
    const result = doorGoodieHandoverSchema.safeParse({
      ticketId: UUID,
      note: 'hoodie out of stock, owes one',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an over-long note', () => {
    expect(
      doorGoodieHandoverSchema.safeParse({ ticketId: UUID, note: 'x'.repeat(281) }).success,
    ).toBe(false);
  });

  it('accepts the sizes actually handed over, per item', () => {
    const result = doorGoodieHandoverSchema.safeParse({
      ticketId: UUID,
      tshirtSize: 'M',
      hoodieSize: 'L',
    });
    expect(result.success && result.data.tshirtSize).toBe('M');
    expect(result.success && result.data.hoodieSize).toBe('L');
  });

  it('treats an absent size as "that item was not handed", not an error', () => {
    const result = doorGoodieHandoverSchema.safeParse({ ticketId: UUID, tshirtSize: 'M' });
    expect(result.success && result.data.hoodieSize).toBeUndefined();
  });

  it('rejects a size that is clearly not a size', () => {
    expect(
      doorGoodieHandoverSchema.safeParse({ ticketId: UUID, tshirtSize: 'x'.repeat(13) }).success,
    ).toBe(false);
  });
});

describe('doorCheckInUndoSchema', () => {
  it('works with just the scanned id — the reason is optional for an undo', () => {
    expect(doorCheckInUndoSchema.safeParse({ scannedId: UUID }).success).toBe(true);
  });

  it('carries the occasion so a queued undo lands on the right day', () => {
    const result = doorCheckInUndoSchema.safeParse({
      scannedId: UUID,
      occasion: 'workshop_day',
    });
    expect(result.success && result.data.occasion).toBe('workshop_day');
  });

  it('rejects an over-long reason', () => {
    expect(
      doorCheckInUndoSchema.safeParse({ scannedId: UUID, reason: 'x'.repeat(501) }).success,
    ).toBe(false);
  });
});

describe('doorBadgePickupSchema', () => {
  it('accepts a scanned id alone', () => {
    expect(doorBadgePickupSchema.safeParse({ scannedId: UUID }).success).toBe(true);
  });

  it('rejects a non-UUID code', () => {
    expect(doorBadgePickupSchema.safeParse({ scannedId: 'nope' }).success).toBe(false);
  });
});

describe('doorStaffInviteSchema', () => {
  it('defaults an unspecified role to scanner, the least privileged', () => {
    const result = doorStaffInviteSchema.safeParse({ email: 'v@zurichjs.com' });
    expect(result.success && result.data.role).toBe('scanner');
  });

  it('lowercases the email to satisfy the table CHECK constraint', () => {
    const result = doorStaffInviteSchema.safeParse({ email: 'Volunteer@ZurichJS.com' });
    expect(result.success && result.data.email).toBe('volunteer@zurichjs.com');
  });

  it('accepts each door role', () => {
    for (const role of ['door_lead', 'scanner', 'goodie'] as const) {
      expect(doorStaffInviteSchema.safeParse({ email: 'v@z.com', role }).success).toBe(true);
    }
  });

  it('rejects a role outside the door vocabulary', () => {
    expect(doorStaffInviteSchema.safeParse({ email: 'v@z.com', role: 'admin' }).success).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(doorStaffInviteSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });
});

describe('doorStaffUpdateSchema', () => {
  it('accepts a role change', () => {
    expect(doorStaffUpdateSchema.safeParse({ role: 'door_lead' }).success).toBe(true);
  });

  it('accepts a revocation', () => {
    expect(doorStaffUpdateSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it('rejects an empty update rather than issuing a no-op write', () => {
    expect(doorStaffUpdateSchema.safeParse({}).success).toBe(false);
  });
});

describe('doorEventQuerySchema', () => {
  it('defaults to a bounded page', () => {
    const result = doorEventQuerySchema.safeParse({});
    expect(result.success && result.data.limit).toBe(50);
  });

  it('coerces a query-string limit', () => {
    const result = doorEventQuerySchema.safeParse({ limit: '25' });
    expect(result.success && result.data.limit).toBe(25);
  });

  it('caps the limit so the audit view cannot be used to dump the table', () => {
    expect(doorEventQuerySchema.safeParse({ limit: '5000' }).success).toBe(false);
  });

  it('accepts occasion as a FILTER here, unlike the mutation schemas', () => {
    expect(doorEventQuerySchema.safeParse({ occasion: 'workshop_day' }).success).toBe(true);
  });

  it('rejects an unknown event type', () => {
    expect(doorEventQuerySchema.safeParse({ eventType: 'exploded' }).success).toBe(false);
  });
});
