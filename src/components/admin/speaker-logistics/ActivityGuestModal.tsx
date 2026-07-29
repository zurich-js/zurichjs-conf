/**
 * Activity Guest Modal
 * Create/edit form for additional guests on speaker-week activities:
 * who they are, which activity, how they got their seat (plus one, volunteer,
 * complimentary, paid + Stripe link), and dietary needs.
 */

import React, { useMemo, useState } from 'react';
import { AdminModal, AdminModalFooter } from '@/components/admin/AdminModal';
import { SPEAKER_LOGISTICS_EVENTS, type SpeakerLogisticsEventKey } from '@/data/speaker-logistics-events';
import {
  ACTIVITY_GUEST_TYPES,
  ACTIVITY_GUEST_TYPE_LABELS,
  type ActivityGuestType,
} from '@/lib/types/speaker-logistics';
import { activityGuestSchema, type ActivityGuestFormData } from '@/lib/validations/speaker-logistics';
import type { ActivityGuestAdminRow, SpeakerLogisticsAdminRow } from './types';

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none';
const LABEL_CLASS = 'block text-sm font-medium text-gray-700 mb-1';
const ERROR_CLASS = 'mt-1 text-xs text-red-600';

interface GuestFormState {
  activity: SpeakerLogisticsEventKey;
  guest_type: ActivityGuestType;
  first_name: string;
  last_name: string;
  email: string;
  related_speaker_id: string;
  /** CHF amount as typed, converted to cents on save */
  amount_paid: string;
  stripe_payment_link: string;
  dietary_restrictions: string;
  admin_notes: string;
}

interface ActivityGuestModalProps {
  /** Existing guest when editing, null when adding */
  guest: ActivityGuestAdminRow | null;
  speakers: SpeakerLogisticsAdminRow[];
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (data: ActivityGuestFormData) => void;
}

function buildFormState(guest: ActivityGuestAdminRow | null): GuestFormState {
  return {
    activity: (guest?.activity as SpeakerLogisticsEventKey) ?? 'speakers_dinner',
    guest_type: (guest?.guest_type as ActivityGuestType) ?? 'speaker_plus_one',
    first_name: guest?.first_name ?? '',
    last_name: guest?.last_name ?? '',
    email: guest?.email ?? '',
    related_speaker_id: guest?.related_speaker_id ?? '',
    amount_paid: guest?.amount_paid != null ? (guest.amount_paid / 100).toString() : '',
    stripe_payment_link: guest?.stripe_payment_link ?? '',
    dietary_restrictions: guest?.dietary_restrictions ?? '',
    admin_notes: guest?.admin_notes ?? '',
  };
}

function toPayload(form: GuestFormState): ActivityGuestFormData {
  return {
    activity: form.activity,
    guest_type: form.guest_type,
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    email: form.email.trim(),
    related_speaker_id: form.related_speaker_id || null,
    amount_paid: form.amount_paid.trim() ? Math.round(Number(form.amount_paid) * 100) : null,
    stripe_payment_link: form.stripe_payment_link.trim(),
    dietary_restrictions: form.dietary_restrictions.trim() || null,
    admin_notes: form.admin_notes.trim() || null,
  };
}

export function ActivityGuestModal({
  guest,
  speakers,
  isSubmitting,
  onClose,
  onSave,
}: ActivityGuestModalProps) {
  const [form, setForm] = useState<GuestFormState>(() => buildFormState(guest));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sortedSpeakers = useMemo(
    () =>
      [...speakers].sort((a, b) =>
        `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
      ),
    [speakers]
  );

  const setField = <K extends keyof GuestFormState>(field: K, value: GuestFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const payload = toPayload(form);
    if (form.amount_paid.trim() && !Number.isFinite(Number(form.amount_paid))) {
      setErrors({ amount_paid: 'Enter a valid amount in CHF' });
      return;
    }
    const result = activityGuestSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0] ?? '');
        if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onSave(result.data);
  };

  const isPaid = form.guest_type === 'paid';
  const isPlusOne = form.guest_type === 'speaker_plus_one';

  return (
    <AdminModal
      onClose={onClose}
      title={guest ? 'Edit guest' : 'Add guest'}
      subtitle="Additional guest for a speaker-week activity"
      size="2xl"
      footer={
        <AdminModalFooter
          onCancel={onClose}
          onConfirm={handleSubmit}
          confirmText={guest ? 'Save guest' : 'Add guest'}
          isLoading={isSubmitting}
        />
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="guest-activity" className={LABEL_CLASS}>
              Activity
            </label>
            <select
              id="guest-activity"
              value={form.activity}
              onChange={(e) => setField('activity', e.target.value as SpeakerLogisticsEventKey)}
              className={INPUT_CLASS}
            >
              {SPEAKER_LOGISTICS_EVENTS.map((event) => (
                <option key={event.key} value={event.key}>
                  {event.shortLabel}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="guest-type" className={LABEL_CLASS}>
              Guest type
            </label>
            <select
              id="guest-type"
              value={form.guest_type}
              onChange={(e) => setField('guest_type', e.target.value as ActivityGuestType)}
              className={INPUT_CLASS}
            >
              {ACTIVITY_GUEST_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ACTIVITY_GUEST_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="guest-first-name" className={LABEL_CLASS}>
              First name
            </label>
            <input
              id="guest-first-name"
              type="text"
              value={form.first_name}
              onChange={(e) => setField('first_name', e.target.value)}
              className={INPUT_CLASS}
            />
            {errors.first_name && <p className={ERROR_CLASS}>{errors.first_name}</p>}
          </div>
          <div>
            <label htmlFor="guest-last-name" className={LABEL_CLASS}>
              Last name
            </label>
            <input
              id="guest-last-name"
              type="text"
              value={form.last_name}
              onChange={(e) => setField('last_name', e.target.value)}
              className={INPUT_CLASS}
            />
            {errors.last_name && <p className={ERROR_CLASS}>{errors.last_name}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="guest-email" className={LABEL_CLASS}>
            Email <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="guest-email"
            type="email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            className={INPUT_CLASS}
          />
          {errors.email && <p className={ERROR_CLASS}>{errors.email}</p>}
        </div>

        {isPlusOne && (
          <div>
            <label htmlFor="guest-speaker" className={LABEL_CLASS}>
              Plus one of
            </label>
            <select
              id="guest-speaker"
              value={form.related_speaker_id}
              onChange={(e) => setField('related_speaker_id', e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Select a speaker...</option>
              {sortedSpeakers.map((speaker) => (
                <option key={speaker.speaker_id} value={speaker.speaker_id}>
                  {speaker.first_name} {speaker.last_name}
                </option>
              ))}
            </select>
            {errors.related_speaker_id && <p className={ERROR_CLASS}>{errors.related_speaker_id}</p>}
          </div>
        )}

        {isPaid && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="guest-amount" className={LABEL_CLASS}>
                Amount paid (CHF)
              </label>
              <input
                id="guest-amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.amount_paid}
                onChange={(e) => setField('amount_paid', e.target.value)}
                className={INPUT_CLASS}
              />
              {errors.amount_paid && <p className={ERROR_CLASS}>{errors.amount_paid}</p>}
            </div>
            <div>
              <label htmlFor="guest-stripe-link" className={LABEL_CLASS}>
                Stripe link <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                id="guest-stripe-link"
                type="url"
                placeholder="https://..."
                value={form.stripe_payment_link}
                onChange={(e) => setField('stripe_payment_link', e.target.value)}
                className={INPUT_CLASS}
              />
              {errors.stripe_payment_link && <p className={ERROR_CLASS}>{errors.stripe_payment_link}</p>}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="guest-dietary" className={LABEL_CLASS}>
            Dietary restrictions <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="guest-dietary"
            type="text"
            value={form.dietary_restrictions}
            onChange={(e) => setField('dietary_restrictions', e.target.value)}
            className={INPUT_CLASS}
          />
          {errors.dietary_restrictions && <p className={ERROR_CLASS}>{errors.dietary_restrictions}</p>}
        </div>

        <div>
          <label htmlFor="guest-notes" className={LABEL_CLASS}>
            Notes <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            id="guest-notes"
            rows={2}
            value={form.admin_notes}
            onChange={(e) => setField('admin_notes', e.target.value)}
            className={INPUT_CLASS}
          />
          {errors.admin_notes && <p className={ERROR_CLASS}>{errors.admin_notes}</p>}
        </div>
      </div>
    </AdminModal>
  );
}
