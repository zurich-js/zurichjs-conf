/**
 * Activity guest helpers
 * Normalization for the admin-managed additional guests on speaker-week
 * activities (speaker_activity_guests table)
 */

import type { ActivityGuestFormData } from '@/lib/validations/speaker-logistics';
import type { ActivityGuestInsert } from '@/lib/types/speaker-logistics';

/**
 * Turn a validated guest payload into a clean DB record: trims text, converts
 * empty strings to NULL, and zeroes out fields that don't apply to the guest
 * type (payment details for non-paying guests, the related speaker for guests
 * who aren't a plus one).
 */
export function normalizeActivityGuest(
  data: ActivityGuestFormData
): Omit<ActivityGuestInsert, 'id' | 'created_at' | 'updated_at'> {
  const isPaid = data.guest_type === 'paid';
  const isPlusOne = data.guest_type === 'speaker_plus_one';

  return {
    activity: data.activity,
    guest_type: data.guest_type,
    first_name: data.first_name.trim(),
    last_name: data.last_name.trim(),
    email: data.email?.trim() || null,
    related_speaker_id: isPlusOne ? (data.related_speaker_id ?? null) : null,
    amount_paid: isPaid ? (data.amount_paid ?? null) : null,
    stripe_payment_link: isPaid ? data.stripe_payment_link?.trim() || null : null,
    dietary_restrictions: data.dietary_restrictions?.trim() || null,
    admin_notes: data.admin_notes?.trim() || null,
  };
}
