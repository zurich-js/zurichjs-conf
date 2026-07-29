import { describe, expect, it } from 'vitest';
import { normalizeActivityGuest } from '../guests';
import { activityGuestSchema, type ActivityGuestFormData } from '@/lib/validations/speaker-logistics';

const SPEAKER_ID = '4e3c2f9a-1b6d-4c8e-9f0a-2d5b7c1e8a3f';

function validGuest(overrides: Partial<ActivityGuestFormData> = {}): ActivityGuestFormData {
  return {
    activity: 'speakers_dinner',
    guest_type: 'volunteer',
    first_name: 'Jamie',
    last_name: 'Muster',
    email: 'jamie@example.com',
    related_speaker_id: null,
    amount_paid: null,
    stripe_payment_link: null,
    dietary_restrictions: null,
    admin_notes: null,
    ...overrides,
  };
}

describe('activityGuestSchema', () => {
  it('accepts a minimal volunteer guest', () => {
    const result = activityGuestSchema.safeParse(validGuest({ email: '' }));
    expect(result.success).toBe(true);
  });

  it('rejects an unknown activity or guest type', () => {
    expect(activityGuestSchema.safeParse(validGuest({ activity: 'gala' as never })).success).toBe(false);
    expect(activityGuestSchema.safeParse(validGuest({ guest_type: 'vip' as never })).success).toBe(false);
  });

  it('requires a name', () => {
    const result = activityGuestSchema.safeParse(validGuest({ first_name: '' }));
    expect(result.success).toBe(false);
  });

  it('rejects invalid emails but allows empty ones', () => {
    expect(activityGuestSchema.safeParse(validGuest({ email: 'not-an-email' })).success).toBe(false);
    expect(activityGuestSchema.safeParse(validGuest({ email: '' })).success).toBe(true);
    expect(activityGuestSchema.safeParse(validGuest({ email: null })).success).toBe(true);
  });

  it('requires the related speaker for plus ones', () => {
    const missing = activityGuestSchema.safeParse(validGuest({ guest_type: 'speaker_plus_one' }));
    expect(missing.success).toBe(false);
    if (!missing.success) {
      expect(missing.error.issues.some((issue) => issue.path[0] === 'related_speaker_id')).toBe(true);
    }

    const withSpeaker = activityGuestSchema.safeParse(
      validGuest({ guest_type: 'speaker_plus_one', related_speaker_id: SPEAKER_ID })
    );
    expect(withSpeaker.success).toBe(true);
  });

  it('requires the amount for paid guests and rejects negative amounts', () => {
    const missing = activityGuestSchema.safeParse(validGuest({ guest_type: 'paid', amount_paid: null }));
    expect(missing.success).toBe(false);
    if (!missing.success) {
      expect(missing.error.issues.some((issue) => issue.path[0] === 'amount_paid')).toBe(true);
    }

    expect(activityGuestSchema.safeParse(validGuest({ guest_type: 'paid', amount_paid: -100 })).success).toBe(false);
    expect(activityGuestSchema.safeParse(validGuest({ guest_type: 'paid', amount_paid: 4500 })).success).toBe(true);
  });

  it('rejects a malformed stripe link', () => {
    const result = activityGuestSchema.safeParse(
      validGuest({ guest_type: 'paid', amount_paid: 4500, stripe_payment_link: 'not-a-url' })
    );
    expect(result.success).toBe(false);
  });
});

describe('normalizeActivityGuest', () => {
  it('trims text fields and converts empty strings to null', () => {
    const record = normalizeActivityGuest(
      validGuest({
        first_name: '  Jamie ',
        last_name: ' Muster ',
        email: '  ',
        dietary_restrictions: '  vegan ',
        admin_notes: '',
      })
    );

    expect(record.first_name).toBe('Jamie');
    expect(record.last_name).toBe('Muster');
    expect(record.email).toBeNull();
    expect(record.dietary_restrictions).toBe('vegan');
    expect(record.admin_notes).toBeNull();
  });

  it('zeroes out payment fields for non-paying guests', () => {
    const record = normalizeActivityGuest(
      validGuest({
        guest_type: 'complimentary',
        amount_paid: 4500,
        stripe_payment_link: 'https://buy.stripe.com/test',
      })
    );

    expect(record.amount_paid).toBeNull();
    expect(record.stripe_payment_link).toBeNull();
  });

  it('keeps payment details for paid guests', () => {
    const record = normalizeActivityGuest(
      validGuest({
        guest_type: 'paid',
        amount_paid: 4500,
        stripe_payment_link: 'https://buy.stripe.com/test',
      })
    );

    expect(record.amount_paid).toBe(4500);
    expect(record.stripe_payment_link).toBe('https://buy.stripe.com/test');
  });

  it('only keeps the related speaker for plus ones', () => {
    const plusOne = normalizeActivityGuest(
      validGuest({ guest_type: 'speaker_plus_one', related_speaker_id: SPEAKER_ID })
    );
    expect(plusOne.related_speaker_id).toBe(SPEAKER_ID);

    const volunteer = normalizeActivityGuest(
      validGuest({ guest_type: 'volunteer', related_speaker_id: SPEAKER_ID })
    );
    expect(volunteer.related_speaker_id).toBeNull();
  });
});
