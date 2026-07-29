/**
 * Activity Guests Section
 * Admin-managed additional guests per speaker-week activity (plus ones added
 * manually, volunteers, complimentary invites, and paying externals) with
 * payment tracking for the paid ones.
 */

import React, { useMemo, useState } from 'react';
import { ExternalLink, Loader2, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { SPEAKER_LOGISTICS_EVENTS } from '@/data/speaker-logistics-events';
import {
  ACTIVITY_GUEST_TYPE_LABELS,
  type ActivityGuestType,
} from '@/lib/types/speaker-logistics';
import type { ActivityGuestFormData } from '@/lib/validations/speaker-logistics';
import { ActivityGuestModal } from './ActivityGuestModal';
import { useActivityGuests, useCreateActivityGuest, useDeleteActivityGuest, useUpdateActivityGuest } from './hooks';
import type { ActivityGuestAdminRow, SpeakerLogisticsAdminRow } from './types';

const TYPE_BADGE_CLASSES: Record<ActivityGuestType, string> = {
  speaker_plus_one: 'bg-green-100 text-green-800',
  volunteer: 'bg-blue-100 text-blue-800',
  complimentary: 'bg-purple-100 text-purple-800',
  paid: 'bg-amber-100 text-amber-800',
};

function GuestTypeBadge({ type }: { type: string }) {
  const guestType = type as ActivityGuestType;
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        TYPE_BADGE_CLASSES[guestType] ?? 'bg-gray-100 text-gray-800'
      }`}
    >
      {ACTIVITY_GUEST_TYPE_LABELS[guestType] ?? type}
    </span>
  );
}

function formatChf(cents: number): string {
  return `CHF ${(cents / 100).toFixed(2)}`;
}

function GuestRow({
  guest,
  onEdit,
  onDelete,
}: {
  guest: ActivityGuestAdminRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            {guest.first_name} {guest.last_name}
          </span>
          <GuestTypeBadge type={guest.guest_type} />
          {guest.guest_type === 'paid' && guest.amount_paid != null && (
            <span className="text-xs font-medium text-gray-700">
              {formatChf(guest.amount_paid)}
              {guest.stripe_payment_link && (
                <a
                  href={guest.stripe_payment_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 inline-flex items-center align-text-bottom text-gray-500 hover:text-gray-900"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">Open Stripe link</span>
                </a>
              )}
            </span>
          )}
        </div>
        <div className="mt-0.5 space-y-0.5 text-xs text-gray-500">
          {guest.email && <p className="break-all">{guest.email}</p>}
          {guest.related_speaker && (
            <p>
              Plus one of {guest.related_speaker.first_name} {guest.related_speaker.last_name}
            </p>
          )}
          {guest.dietary_restrictions && <p>Dietary: {guest.dietary_restrictions}</p>}
          {guest.admin_notes && <p>{guest.admin_notes}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="cursor-pointer rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">
            Edit {guest.first_name} {guest.last_name}
          </span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="cursor-pointer rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">
            Remove {guest.first_name} {guest.last_name}
          </span>
        </button>
      </div>
    </li>
  );
}

interface ActivityGuestsSectionProps {
  speakers: SpeakerLogisticsAdminRow[];
}

export function ActivityGuestsSection({ speakers }: ActivityGuestsSectionProps) {
  const { data, isLoading, error } = useActivityGuests();
  const createGuest = useCreateActivityGuest();
  const updateGuest = useUpdateActivityGuest();
  const deleteGuest = useDeleteActivityGuest();

  const [modalState, setModalState] = useState<{ open: boolean; guest: ActivityGuestAdminRow | null }>({
    open: false,
    guest: null,
  });

  const guests = useMemo(() => data?.guests ?? [], [data?.guests]);
  const guestsByActivity = useMemo(() => {
    const groups = new Map<string, ActivityGuestAdminRow[]>();
    for (const guest of guests) {
      const group = groups.get(guest.activity) ?? [];
      group.push(guest);
      groups.set(guest.activity, group);
    }
    return groups;
  }, [guests]);

  const closeModal = () => setModalState({ open: false, guest: null });

  const handleSave = (input: ActivityGuestFormData) => {
    if (modalState.guest) {
      updateGuest.mutate({ id: modalState.guest.id, input }, { onSuccess: closeModal });
    } else {
      createGuest.mutate(input, { onSuccess: closeModal });
    }
  };

  const handleDelete = (guest: ActivityGuestAdminRow) => {
    if (window.confirm(`Remove ${guest.first_name} ${guest.last_name} from the guest list?`)) {
      deleteGuest.mutate(guest.id);
    }
  };

  return (
    <section aria-label="Additional activity guests" className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Users className="h-4 w-4" aria-hidden="true" />
            Additional guests
            {guests.length > 0 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {guests.length}
              </span>
            )}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Extra invites per activity — plus ones, volunteers, complimentary, or paid externals. Plus ones
            speakers declared in their form are already counted in the stats above; only add them here if
            they came in another way.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalState({ open: true, guest: null })}
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-black hover:bg-[#E5D665]"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Add guest
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" aria-hidden="true" />
          <span className="sr-only">Loading activity guests</span>
        </div>
      ) : error ? (
        <p className="p-4 text-sm text-red-700">Failed to load the guest list. Please refresh and try again.</p>
      ) : guests.length === 0 ? (
        <AdminEmptyState
          icon={<Users className="h-6 w-6" aria-hidden="true" />}
          title="No additional guests yet"
          description="Add plus ones, volunteers, or external guests to the speaker-week activities to track headcounts and payments."
          action={{ label: 'Add guest', onClick: () => setModalState({ open: true, guest: null }) }}
        />
      ) : (
        <div className="divide-y divide-gray-100 px-4">
          {SPEAKER_LOGISTICS_EVENTS.map((event) => {
            const eventGuests = guestsByActivity.get(event.key);
            if (!eventGuests?.length) return null;
            return (
              <div key={event.key} className="py-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {event.shortLabel} · {eventGuests.length} guest{eventGuests.length === 1 ? '' : 's'}
                </h4>
                <ul className="divide-y divide-gray-100">
                  {eventGuests.map((guest) => (
                    <GuestRow
                      key={guest.id}
                      guest={guest}
                      onEdit={() => setModalState({ open: true, guest })}
                      onDelete={() => handleDelete(guest)}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {modalState.open && (
        <ActivityGuestModal
          guest={modalState.guest}
          speakers={speakers}
          isSubmitting={createGuest.isPending || updateGuest.isPending}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </section>
  );
}
