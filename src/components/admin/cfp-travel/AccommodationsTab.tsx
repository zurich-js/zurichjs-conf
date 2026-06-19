/**
 * Accommodations Tab Component
 * Generic room tracking for speakers and other guests.
 */

import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Pagination } from '@/components/atoms';
import type { AccommodationBookingStatus, AccommodationBookingWithContext, Hotel, SpeakerWithTravel } from '@/lib/cfp/admin-travel';
import { AccommodationModal } from './AccommodationModal';
import { calculateNights } from './types';

interface AccommodationsTabProps {
  bookings: AccommodationBookingWithContext[];
  hotels: Hotel[];
  speakers: SpeakerWithTravel[];
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreate: (data: Record<string, unknown>) => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  isUpdating: boolean;
}

const STATUS_LABELS: Record<AccommodationBookingStatus, string> = {
  draft: 'Draft',
  pending_details: 'Pending details',
  pending_payment: 'Pending payment',
  confirmed: 'Confirmed',
  canceled: 'Canceled',
};

const STATUS_CLASSES: Record<AccommodationBookingStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_details: 'bg-yellow-100 text-yellow-800',
  pending_payment: 'bg-orange-100 text-orange-800',
  confirmed: 'bg-green-100 text-green-800',
  canceled: 'bg-red-100 text-red-800',
};

export function AccommodationsTab({
  bookings,
  hotels,
  speakers,
  isLoading,
  currentPage,
  onPageChange,
  pageSize,
  searchQuery,
  onSearchChange,
  onCreate,
  onUpdate,
  onDelete,
  isUpdating,
}: AccommodationsTabProps) {
  const [filter, setFilter] = useState<AccommodationBookingStatus | 'all'>('all');
  const [editing, setEditing] = useState<AccommodationBookingWithContext | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bookings.filter((booking) => {
      if (filter !== 'all' && booking.status !== filter) return false;
      if (!q) return true;
      const speakerName = booking.speaker ? `${booking.speaker.first_name} ${booking.speaker.last_name}` : '';
      const hotelNames = booking.rooms.map((room) => room.hotel?.name ?? '').join(' ');
      const haystack = `${booking.guest_name} ${booking.guest_email ?? ''} ${speakerName} ${hotelNames}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [bookings, filter, searchQuery]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);
  const roomCount = filtered.reduce((sum, booking) => sum + booking.rooms.length, 0);
  const peopleCount = filtered.reduce((sum, booking) => sum + booking.rooms.reduce((roomSum, room) => roomSum + room.people_count, 0), 0);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-black">Accommodations</h2>
            <p className="text-sm text-gray-500">{filtered.length} bookings · {roomCount} rooms · {peopleCount} people</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search guest, hotel, speaker"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary hover:bg-[#e8d95e] text-black font-medium rounded-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto mt-4">
          {(['all', 'draft', 'pending_details', 'pending_payment', 'confirmed', 'canceled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => { setFilter(status); onPageChange(1); }}
              className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap cursor-pointer ${
                filter === status ? 'bg-brand-primary text-black' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'All' : STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : paginated.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          No accommodations found
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-gray-500">
                <tr>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Stay</th>
                  <th className="px-4 py-3">Rooms</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Flight Context</th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginated.map((booking) => (
                  <AccommodationRow
                    key={booking.id}
                    booking={booking}
                    onEdit={setEditing}
                    onDelete={onDelete}
                    isUpdating={isUpdating}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={pageSize}
            totalItems={filtered.length}
            variant="light"
          />
        </div>
      )}

      {(isCreating || editing) && (
        <AccommodationModal
          booking={editing}
          hotels={hotels}
          speakers={speakers}
          isSubmitting={isUpdating}
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

function AccommodationRow({
  booking,
  onEdit,
  onDelete,
  isUpdating,
}: {
  booking: AccommodationBookingWithContext;
  onEdit: (booking: AccommodationBookingWithContext) => void;
  onDelete: (id: string) => void;
  isUpdating: boolean;
}) {
  const firstCheckIn = booking.rooms.map((room) => room.check_in_date).filter(Boolean).sort()[0] ?? null;
  const sortedCheckOuts = booking.rooms.map((room) => room.check_out_date).filter(Boolean).sort();
  const lastCheckOut = sortedCheckOuts[sortedCheckOuts.length - 1] ?? null;
  const nights = calculateNights(firstCheckIn, lastCheckOut);
  const roomCount = booking.rooms.length;
  const peopleCount = booking.rooms.reduce((sum, room) => sum + room.people_count, 0);
  const hotelNames = [...new Set(booking.rooms.map((room) => room.hotel?.name ?? 'Hotel TBD'))].join(', ');
  const roomNames = booking.rooms.map((room) => room.room_name).join(' · ');

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-4">
        <div className="font-medium text-gray-900">{booking.guest_name}</div>
        <div className="text-xs text-gray-500">
          {booking.speaker ? `${booking.speaker.first_name} ${booking.speaker.last_name}` : 'Other'}
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-gray-600">
        <div>{firstCheckIn || 'TBD'} → {lastCheckOut || 'TBD'}</div>
        <div className="text-xs text-gray-400">{nights !== null ? `${nights} night${nights !== 1 ? 's' : ''}` : 'Dates pending'}</div>
      </td>
      <td className="px-4 py-4 text-sm text-gray-600">
        <div>{roomCount} room{roomCount !== 1 ? 's' : ''} · {peopleCount} people</div>
        <div className="text-xs text-gray-400">{hotelNames}</div>
        <div className="text-xs text-gray-400">{roomNames || 'Room type TBD'}</div>
      </td>
      <td className="px-4 py-4">
        <span className={`px-2 py-0.5 text-xs rounded ${STATUS_CLASSES[booking.status]}`}>
          {STATUS_LABELS[booking.status]}
        </span>
      </td>
      <td className="px-4 py-4 text-sm text-gray-600">
        <div>Guest: CHF {(booking.guest_amount / 100).toFixed(2)}</div>
        <div className="text-xs text-gray-400">Conference: CHF {(booking.conference_amount / 100).toFixed(2)}</div>
      </td>
      <td className="px-4 py-4 text-sm text-gray-600">
        {booking.next_outbound_flight ? (
          <>
            <div>{booking.next_outbound_flight.flight_number || booking.next_outbound_flight.airline || 'Outbound flight'}</div>
            <div className="text-xs text-gray-400">
              Departs {booking.next_outbound_flight.departure_time ? new Date(booking.next_outbound_flight.departure_time).toLocaleString() : 'TBD'}
            </div>
          </>
        ) : (
          <span className="text-gray-400">No linked flight</span>
        )}
      </td>
      <td className="px-4 py-4">
        <div className="flex gap-2">
          <button onClick={() => onEdit(booking)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 cursor-pointer" aria-label="Edit accommodation">
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this accommodation booking?')) onDelete(booking.id);
            }}
            disabled={isUpdating}
            className="p-2 rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-50 cursor-pointer"
            aria-label="Delete accommodation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
