import { describe, expect, it } from 'vitest';
import { attendeeInfoSchema, checkoutFormSchema } from '../checkout';

const baseAttendee = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
};

describe('attendeeInfoSchema', () => {
  it('accepts attendees without apparel sizes (deferred to manage-order)', () => {
    expect(attendeeInfoSchema.safeParse(baseAttendee).success).toBe(true);
  });

  it('accepts valid apparel sizes when provided', () => {
    const result = attendeeInfoSchema.safeParse({
      ...baseAttendee,
      tshirtSize: 'M',
      hoodieSize: 'L',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown apparel sizes', () => {
    const result = attendeeInfoSchema.safeParse({ ...baseAttendee, tshirtSize: 'HUGE' });
    expect(result.success).toBe(false);
  });
});

describe('checkoutFormSchema', () => {
  const baseCheckout = {
    email: 'ada@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    addressLine1: 'Bahnhofstrasse 1',
    city: 'Zurich',
    postalCode: '8001',
    country: 'Switzerland',
    agreeToTerms: true,
  };

  it('accepts a checkout without company, job title, or apparel sizes', () => {
    expect(checkoutFormSchema.safeParse(baseCheckout).success).toBe(true);
  });

  it('still requires the billing address', () => {
    const { addressLine1: _addressLine1, ...withoutAddress } = baseCheckout;
    const result = checkoutFormSchema.safeParse(withoutAddress);
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === 'addressLine1')).toBe(true);
  });

  it('still requires agreeing to the terms', () => {
    const result = checkoutFormSchema.safeParse({ ...baseCheckout, agreeToTerms: false });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === 'agreeToTerms')).toBe(true);
  });
});
