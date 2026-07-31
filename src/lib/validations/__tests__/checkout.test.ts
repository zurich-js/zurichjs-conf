import { describe, expect, it } from 'vitest';
import {
  attendeeInfoSchema,
  ticketAttendeeInfoSchema,
  vipTicketAttendeeInfoSchema,
} from '../checkout';

const baseAttendee = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
};

describe('attendeeInfoSchema', () => {
  it('accepts attendees without apparel sizes (workshop seats)', () => {
    expect(attendeeInfoSchema.safeParse(baseAttendee).success).toBe(true);
  });

  it('rejects unknown apparel sizes', () => {
    const result = attendeeInfoSchema.safeParse({ ...baseAttendee, tshirtSize: 'HUGE' });
    expect(result.success).toBe(false);
  });
});

describe('ticketAttendeeInfoSchema', () => {
  it('requires a t-shirt size', () => {
    const result = ticketAttendeeInfoSchema.safeParse(baseAttendee);
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === 'tshirtSize')).toBe(true);
  });

  it('accepts a valid t-shirt size without a hoodie size', () => {
    const result = ticketAttendeeInfoSchema.safeParse({ ...baseAttendee, tshirtSize: 'M' });
    expect(result.success).toBe(true);
  });
});

describe('vipTicketAttendeeInfoSchema', () => {
  it('requires both t-shirt and hoodie sizes', () => {
    const result = vipTicketAttendeeInfoSchema.safeParse({ ...baseAttendee, tshirtSize: 'M' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === 'hoodieSize')).toBe(true);

    expect(
      vipTicketAttendeeInfoSchema.safeParse({ ...baseAttendee, tshirtSize: 'M', hoodieSize: 'L' })
        .success
    ).toBe(true);
  });
});
