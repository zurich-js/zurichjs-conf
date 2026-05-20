/**
 * Speaker Accommodation Section
 * Shows neutral accommodation bookings linked to the current speaker.
 * The legacy cfp_speaker_accommodation row is displayed as read-only fallback
 * so existing data is not hidden while new writes use accommodation_bookings.
 */

import { useState } from 'react';
import { Hotel, Pencil, Plane, Plus, Trash2 } from 'lucide-react';
import type { CfpSpeakerAccommodation, CfpSpeakerFlight } from '@/lib/types/cfp';
import type { AccommodationBookingWithContext, Hotel as HotelCatalog, SpeakerWithTravel } from '@/lib/cfp/admin-travel';
import { AccommodationModal } from './AccommodationModal';
import { calculateNights, deriveHotelDatesFromFlights } from './types';

interface SpeakerAccommodationSectionProps {
  speaker: SpeakerWithTravel;
  legacyAccommodation: CfpSpeakerAccommodation | null;
  bookings: AccommodationBookingWithContext[];
  unlinkedBookings?: AccommodationBookingWithContext[];
  hotels: HotelCatalog[];
  speakers: SpeakerWithTravel[];
  flights: CfpSpeakerFlight[];
  onCreate: (data: Record<string, unknown>) => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onLink: (id: string) => void;
  isSubmitting: boolean;
}

export function SpeakerAccommodationSection({
  speaker,
  legacyAccommodation,
  bookings,
  unlinkedBookings = [],
  hotels,
  speakers,
  flights,
  onCreate,
  onUpdate,
  onDelete,
  onLink,
  isSubmitting,
}: SpeakerAccommodationSectionProps) {
  const [editing, setEditing] = useState<AccommodationBookingWithContext | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [linkBookingId, setLinkBookingId] = useState('');

  const suggested = deriveHotelDatesFromFlights(flights);
  const displayNights = calculateNights(
    legacyAccommodation?.check_in_date ?? null,
    legacyAccommodation?.check_out_date ?? null
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Hotel className="w-4 h-4" />
          Accommodation
        </h3>
        <div className="flex gap-2">
          {unlinkedBookings.length > 0 && (
            <button
              onClick={() => setShowLink((value) => !value)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Link accommodation
            </button>
          )}
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-primary text-black hover:bg-[#e8d95e] cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Add accommodation
          </button>
        </div>
      </div>

      {showLink && (
        <div className="mb-3 border border-gray-200 rounded-lg p-3 bg-gray-50 flex flex-col sm:flex-row gap-2">
          <select value={linkBookingId} onChange={(event) => setLinkBookingId(event.target.value)} className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none">
            <option value="">Select unlinked accommodation</option>
            {unlinkedBookings.map((booking) => {
              const hotels = [...new Set(booking.rooms.map((room) => room.hotel?.name ?? 'Hotel TBD'))].join(', ');
              return (
                <option key={booking.id} value={booking.id}>
                  {booking.guest_name} · {hotels || 'Hotel TBD'}
                </option>
              );
            })}
          </select>
          <button
            type="button"
            onClick={() => {
              if (!linkBookingId) return;
              onLink(linkBookingId);
              setLinkBookingId('');
              setShowLink(false);
            }}
            disabled={!linkBookingId || isSubmitting}
            className="px-3 py-2 text-sm rounded-lg bg-brand-primary text-black hover:bg-[#e8d95e] disabled:opacity-50 cursor-pointer"
          >
            Link
          </button>
        </div>
      )}

      {bookings.length === 0 && !legacyAccommodation?.hotel_name && (
        <>
          {suggested && (suggested.check_in_date || suggested.check_out_date) && (
            <div className="mb-3 border border-blue-200 bg-blue-50 rounded-lg p-3 flex items-start gap-2">
              <Plane className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-900">
                <div className="font-medium mb-0.5">Suggested from flights</div>
                <div>
                  Check-in: {suggested.check_in_date || '—'} · Check-out: {suggested.check_out_date || '—'}
                  {suggested.nights !== null && (
                    <span className="ml-2 font-medium">({suggested.nights} night{suggested.nights !== 1 ? 's' : ''})</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <p className="text-sm text-gray-500 py-3">No hotel booked yet.</p>
        </>
      )}

      {bookings.length > 0 && (
        <div className="space-y-2">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onEdit={setEditing}
              onDelete={onDelete}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}

      {legacyAccommodation?.hotel_name && (
        <div className="mt-3 border border-amber-200 bg-amber-50 rounded-lg p-3">
          <div className="text-xs font-medium text-amber-900 mb-2">Legacy accommodation record</div>
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium text-gray-900 text-sm">{legacyAccommodation.hotel_name}</div>
              {legacyAccommodation.hotel_address && (
                <div className="text-xs text-gray-500 mt-0.5">{legacyAccommodation.hotel_address}</div>
              )}
            </div>
            {displayNights !== null && (
              <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 font-medium">
                {displayNights} night{displayNights !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2 text-xs text-gray-600">
            <div><span className="text-gray-400">Check-in:</span> {legacyAccommodation.check_in_date || 'TBD'}</div>
            <div><span className="text-gray-400">Check-out:</span> {legacyAccommodation.check_out_date || 'TBD'}</div>
          </div>
        </div>
      )}

      {(isCreating || editing) && (
        <AccommodationModal
          booking={editing}
          defaultSpeaker={speaker}
          hotels={hotels}
          speakers={speakers}
          isSubmitting={isSubmitting}
          onClose={() => { setEditing(null); setIsCreating(false); }}
          onSave={(data) => {
            if (editing) onUpdate(editing.id, data);
            else onCreate(data);
            setEditing(null);
            setIsCreating(false);
          }}
        />
      )}
    </div>
  );
}

function BookingCard({
  booking,
  onEdit,
  onDelete,
  isSubmitting,
}: {
  booking: AccommodationBookingWithContext;
  onEdit: (booking: AccommodationBookingWithContext) => void;
  onDelete: (id: string) => void;
  isSubmitting: boolean;
}) {
  const firstCheckIn = booking.rooms.map((room) => room.check_in_date).filter(Boolean).sort()[0] ?? null;
  const sortedCheckOuts = booking.rooms.map((room) => room.check_out_date).filter(Boolean).sort();
  const lastCheckOut = sortedCheckOuts[sortedCheckOuts.length - 1] ?? null;
  const nights = calculateNights(firstCheckIn, lastCheckOut);
  const hotels = [...new Set(booking.rooms.map((room) => room.hotel?.name ?? 'Hotel TBD'))].join(', ');
  const roomNames = booking.rooms.map((room) => room.room_name).join(' · ');
  const people = booking.rooms.reduce((sum, room) => sum + room.people_count, 0);

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-gray-900 text-sm">{booking.guest_name}</div>
          <div className="text-xs text-gray-500">{hotels}</div>
          <div className="text-xs text-gray-400">{roomNames || 'Room type TBD'}</div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onEdit(booking)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer" aria-label="Edit accommodation">
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Delete this accommodation booking?')) onDelete(booking.id);
            }}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
            aria-label="Delete accommodation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs text-gray-600">
        <div><span className="text-gray-400">Stay:</span> {firstCheckIn || 'TBD'} → {lastCheckOut || 'TBD'}</div>
        <div><span className="text-gray-400">Nights:</span> {nights ?? '-'}</div>
        <div><span className="text-gray-400">Rooms:</span> {booking.rooms.length}</div>
        <div><span className="text-gray-400">People:</span> {people}</div>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Conference: CHF {(booking.conference_amount / 100).toFixed(2)} · Guest: CHF {(booking.guest_amount / 100).toFixed(2)}
      </div>
      {booking.next_outbound_flight && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-blue-700">
          <Plane className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Outbound: {booking.next_outbound_flight.flight_number || booking.next_outbound_flight.airline || 'flight'}
            {booking.next_outbound_flight.departure_time ? ` departs ${new Date(booking.next_outbound_flight.departure_time).toLocaleString()}` : ''}
          </span>
        </div>
      )}
    </div>
  );
}
