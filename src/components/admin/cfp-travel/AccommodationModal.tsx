import { useMemo, useState, type ReactNode } from 'react';
import { Hotel as HotelIcon, Plus, Trash2 } from 'lucide-react';
import { AdminModal } from '@/components/admin/AdminModal';
import type { AccommodationBookingStatus, AccommodationBookingWithContext, Hotel, SpeakerWithTravel } from '@/lib/cfp/admin-travel';
import { calculateNights, deriveHotelDatesFromFlights } from './types';

const INPUT_CLASS = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none';
const OTHER_VALUE = '__other__';
const CUSTOM_ROOM_VALUE = '__custom_room__';
const TEMP_HOTEL_PREFIX = 'temp-hotel-';
const TEMP_ROOM_PREFIX = 'temp-room-';

const BOOKING_STATUSES: { value: AccommodationBookingStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_details', label: 'Pending details' },
  { value: 'pending_payment', label: 'Pending payment' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'canceled', label: 'Canceled' },
];

interface RoomFormData {
  id: string;
  hotel_id: string;
  hotel_name: string;
  hotel_address: string;
  room_type_id: string;
  room_type_name: string;
  save_room_type: boolean;
  people_count: string;
  check_in_date: string;
  check_out_date: string;
  nightly_rate: string;
}

interface HotelFormData {
  name: string;
  address: string;
  room_name: string;
  nightly_rate: string;
  occupancy: string;
}

interface RoomTypeFormData {
  hotel_id: string;
  name: string;
  nightly_rate: string;
  occupancy: string;
}

interface AccommodationFormData {
  accommodation_for: string;
  guest_name: string;
  guest_email: string;
  status: AccommodationBookingStatus;
  reservation_number: string;
  reservation_confirmation_url: string;
  conference_amount: string;
  guest_amount: string;
  admin_notes: string;
  rooms: RoomFormData[];
}

interface AccommodationModalProps {
  booking: AccommodationBookingWithContext | null;
  defaultSpeaker?: SpeakerWithTravel | null;
  hotels: Hotel[];
  speakers: SpeakerWithTravel[];
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
}

function newRoom(seed?: Partial<RoomFormData>): RoomFormData {
  return {
    id: crypto.randomUUID(),
    hotel_id: seed?.hotel_id ?? '',
    hotel_name: seed?.hotel_name ?? '',
    hotel_address: seed?.hotel_address ?? '',
    room_type_id: seed?.room_type_id ?? '',
    room_type_name: seed?.room_type_name ?? '',
    save_room_type: seed?.save_room_type ?? false,
    people_count: seed?.people_count ?? '1',
    check_in_date: seed?.check_in_date ?? '',
    check_out_date: seed?.check_out_date ?? '',
    nightly_rate: seed?.nightly_rate ?? '',
  };
}

function buildFormData(booking?: AccommodationBookingWithContext | null, defaultSpeaker?: SpeakerWithTravel | null): AccommodationFormData {
  const suggested = defaultSpeaker ? deriveHotelDatesFromFlights(defaultSpeaker.flights) : null;
  return {
    accommodation_for: booking?.related_speaker_id ?? defaultSpeaker?.id ?? (booking ? OTHER_VALUE : ''),
    guest_name: booking?.guest_name ?? (defaultSpeaker ? `${defaultSpeaker.first_name} ${defaultSpeaker.last_name}` : ''),
    guest_email: booking?.guest_email ?? defaultSpeaker?.email ?? '',
    status: booking?.status ?? 'draft',
    reservation_number: booking?.reservation_number ?? '',
    reservation_confirmation_url: booking?.reservation_confirmation_url ?? '',
    conference_amount: booking?.conference_amount ? (booking.conference_amount / 100).toString() : '',
    guest_amount: booking?.guest_amount ? (booking.guest_amount / 100).toString() : '',
    admin_notes: booking?.admin_notes ?? '',
    rooms: booking?.rooms.length
      ? booking.rooms.map((room) => newRoom({
        hotel_id: room.hotel_id,
        room_type_id: room.room_type_id ?? CUSTOM_ROOM_VALUE,
        room_type_name: room.room_type_id ? '' : room.room_name,
        people_count: String(room.people_count),
        check_in_date: room.check_in_date ?? '',
        check_out_date: room.check_out_date ?? '',
        nightly_rate: room.nightly_rate ? (room.nightly_rate / 100).toString() : '',
      }))
      : [newRoom({
        check_in_date: suggested?.check_in_date ?? '',
        check_out_date: suggested?.check_out_date ?? '',
      })],
  };
}

function cents(value: string): number {
  return value.trim() ? Math.max(0, Math.round(Number(value) * 100)) : 0;
}

function nightsForRoom(room: RoomFormData): number {
  return calculateNights(room.check_in_date || null, room.check_out_date || null) ?? 0;
}

function roomTotal(room: RoomFormData): number {
  return nightsForRoom(room) * cents(room.nightly_rate);
}

function formTotal(form: AccommodationFormData): number {
  return form.rooms.reduce((sum, room) => sum + roomTotal(room), 0);
}

function toPayload(form: AccommodationFormData): Record<string, unknown> {
  const total = formTotal(form);
  const guestAmount = cents(form.guest_amount);
  const conferenceAmount = form.conference_amount.trim()
    ? cents(form.conference_amount)
    : Math.max(0, total - guestAmount);

  return {
    related_speaker_id: form.accommodation_for && form.accommodation_for !== OTHER_VALUE ? form.accommodation_for : null,
    guest_name: form.guest_name,
    guest_email: form.guest_email || null,
    status: form.status,
    reservation_number: form.reservation_number || null,
    reservation_confirmation_url: form.reservation_confirmation_url || null,
    conference_amount: conferenceAmount,
    guest_amount: guestAmount,
    admin_notes: form.admin_notes || null,
    metadata: {},
    rooms: form.rooms.map((room) => ({
      hotel_id: room.hotel_id && !room.hotel_id.startsWith(TEMP_HOTEL_PREFIX) ? room.hotel_id : null,
      hotel_name: room.hotel_id.startsWith(TEMP_HOTEL_PREFIX) ? room.hotel_name : null,
      hotel_address: room.hotel_id.startsWith(TEMP_HOTEL_PREFIX) ? room.hotel_address : null,
      room_type_id: room.room_type_id && !room.room_type_id.startsWith(TEMP_ROOM_PREFIX) && room.room_type_id !== CUSTOM_ROOM_VALUE ? room.room_type_id : null,
      room_type_name: room.room_type_id === CUSTOM_ROOM_VALUE || room.room_type_id.startsWith(TEMP_ROOM_PREFIX) ? room.room_type_name : null,
      save_room_type: room.save_room_type,
      people_count: Math.max(1, Number.parseInt(room.people_count, 10) || 1),
      check_in_date: room.check_in_date || null,
      check_out_date: room.check_out_date || null,
      nightly_rate: cents(room.nightly_rate),
    })),
  };
}

export function AccommodationModal({ booking, defaultSpeaker, hotels, speakers, isSubmitting, onClose, onSave }: AccommodationModalProps) {
  const [form, setForm] = useState<AccommodationFormData>(() => buildFormData(booking, defaultSpeaker));
  const [catalogHotels, setCatalogHotels] = useState<Hotel[]>(hotels);
  const [hotelModal, setHotelModal] = useState<HotelFormData | null>(null);
  const [roomModal, setRoomModal] = useState<RoomTypeFormData | null>(null);
  const total = useMemo(() => formTotal(form), [form]);
  const guestAmount = cents(form.guest_amount);
  const conferenceValue = form.conference_amount || (total > 0 && guestAmount === 0 ? (total / 100).toFixed(2) : '');
  const sliderValue = total > 0 ? Math.min(total, guestAmount) : 0;

  const setPaymentSplit = (nextGuestAmount: number) => {
    const clampedGuest = Math.min(Math.max(0, nextGuestAmount), total);
    setForm((prev) => ({
      ...prev,
      guest_amount: (clampedGuest / 100).toFixed(2),
      conference_amount: ((total - clampedGuest) / 100).toFixed(2),
    }));
  };

  const updateRoom = (id: string, updates: Partial<RoomFormData>) => {
    setForm((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) => room.id === id ? { ...room, ...updates } : room),
    }));
  };

  const handleAccommodationFor = (value: string) => {
    const speaker = speakers.find((item) => item.id === value);
    setForm((prev) => ({
      ...prev,
      accommodation_for: value,
      guest_name: speaker ? `${speaker.first_name} ${speaker.last_name}` : prev.guest_name,
      guest_email: speaker?.email ?? prev.guest_email,
    }));
  };

  const handleRoomType = (room: RoomFormData, value: string) => {
    const hotel = catalogHotels.find((item) => item.id === room.hotel_id);
    const roomType = hotel?.room_types.find((item) => item.id === value);
    updateRoom(room.id, {
      room_type_id: value,
      room_type_name: value === CUSTOM_ROOM_VALUE ? room.room_type_name : '',
      nightly_rate: roomType?.default_nightly_rate ? (roomType.default_nightly_rate / 100).toString() : room.nightly_rate,
      people_count: roomType?.default_occupancy ? String(roomType.default_occupancy) : room.people_count,
    });
  };

  const addRoom = () => {
    const previous = form.rooms[form.rooms.length - 1];
    setForm((prev) => ({
      ...prev,
      rooms: [...prev.rooms, newRoom(previous ? {
        hotel_id: previous.hotel_id,
        check_in_date: previous.check_in_date,
        check_out_date: previous.check_out_date,
      } : undefined)],
    }));
  };

  const saveHotelModal = () => {
    if (!hotelModal?.name.trim() || !hotelModal.room_name.trim()) return;
    const hotelId = `${TEMP_HOTEL_PREFIX}${crypto.randomUUID()}`;
    const roomTypeId = `${TEMP_ROOM_PREFIX}${crypto.randomUUID()}`;
    const roomType = {
      id: roomTypeId,
      hotel_id: hotelId,
      name: hotelModal.room_name.trim(),
      default_nightly_rate: cents(hotelModal.nightly_rate),
      default_occupancy: Math.max(1, Number.parseInt(hotelModal.occupancy, 10) || 1),
      max_occupancy: Math.max(1, Number.parseInt(hotelModal.occupancy, 10) || 1),
      notes: null,
      is_active: true,
      metadata: {},
      created_at: '',
      updated_at: '',
    };
    const hotel: Hotel = {
      id: hotelId,
      name: hotelModal.name.trim(),
      address: hotelModal.address.trim() || null,
      notes: null,
      is_active: true,
      metadata: {},
      room_types: [roomType],
      created_at: '',
      updated_at: '',
    };
    setCatalogHotels((prev) => [...prev, hotel]);
    setForm((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room, index) => index === prev.rooms.length - 1 ? {
        ...room,
        hotel_id: hotelId,
        hotel_name: hotel.name,
        hotel_address: hotel.address ?? '',
        room_type_id: roomTypeId,
        room_type_name: roomType.name,
        save_room_type: true,
        nightly_rate: hotelModal.nightly_rate,
        people_count: hotelModal.occupancy || '1',
      } : room),
    }));
    setHotelModal(null);
  };

  const saveRoomModal = () => {
    if (!roomModal?.hotel_id || !roomModal.name.trim()) return;
    const roomTypeId = `${TEMP_ROOM_PREFIX}${crypto.randomUUID()}`;
    const roomType = {
      id: roomTypeId,
      hotel_id: roomModal.hotel_id,
      name: roomModal.name.trim(),
      default_nightly_rate: cents(roomModal.nightly_rate),
      default_occupancy: Math.max(1, Number.parseInt(roomModal.occupancy, 10) || 1),
      max_occupancy: Math.max(1, Number.parseInt(roomModal.occupancy, 10) || 1),
      notes: null,
      is_active: true,
      metadata: {},
      created_at: '',
      updated_at: '',
    };
    setCatalogHotels((prev) => prev.map((hotel) => hotel.id === roomModal.hotel_id ? {
      ...hotel,
      room_types: [...hotel.room_types, roomType],
    } : hotel));
    setForm((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) => room.hotel_id === roomModal.hotel_id && !room.room_type_id ? {
        ...room,
        room_type_id: roomTypeId,
        room_type_name: roomType.name,
        save_room_type: true,
        nightly_rate: roomModal.nightly_rate,
        people_count: roomModal.occupancy || room.people_count,
      } : room),
    }));
    setRoomModal(null);
  };

  return (
    <AdminModal onClose={onClose} title={booking ? 'Edit Accommodation' : 'Add Accommodation'} subtitle="Track hotels, room lines, booking status, and payment split" size="4xl">
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Accommodation for">
            <select value={form.accommodation_for} onChange={(event) => handleAccommodationFor(event.target.value)} className={INPUT_CLASS}>
              <option value="">Select an option</option>
              <option value={OTHER_VALUE}>Other</option>
              <option disabled>──────────</option>
              {speakers.map((speaker) => (
                <option key={speaker.id} value={speaker.id}>{speaker.first_name} {speaker.last_name}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AccommodationBookingStatus })} className={INPUT_CLASS}>
              {BOOKING_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </Field>
          <Field label="Name">
            <input value={form.guest_name} onChange={(event) => setForm({ ...form, guest_name: event.target.value })} className={INPUT_CLASS} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.guest_email} onChange={(event) => setForm({ ...form, guest_email: event.target.value })} className={INPUT_CLASS} />
          </Field>
          <Field label="Reservation #">
            <input value={form.reservation_number} onChange={(event) => setForm({ ...form, reservation_number: event.target.value })} className={INPUT_CLASS} />
          </Field>
          <Field label="Confirmation URL">
            <input value={form.reservation_confirmation_url} onChange={(event) => setForm({ ...form, reservation_confirmation_url: event.target.value })} className={INPUT_CLASS} />
          </Field>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-900">Rooms</h3>
            <button type="button" onClick={addRoom} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 cursor-pointer">
              <Plus className="w-4 h-4" />
              Add room
            </button>
          </div>
          <div className="space-y-3">
            {form.rooms.map((room, index) => (
              <RoomLine
                key={room.id}
                index={index}
                room={room}
                hotels={catalogHotels}
                canRemove={form.rooms.length > 1}
                onChange={(updates) => updateRoom(room.id, updates)}
                onRoomTypeChange={(value) => handleRoomType(room, value)}
                onAddHotel={() => setHotelModal({ name: '', address: '', room_name: '', nightly_rate: '', occupancy: '1' })}
                onAddRoomType={(hotelId) => setRoomModal({ hotel_id: hotelId, name: '', nightly_rate: '', occupancy: '1' })}
                onRemove={() => setForm((prev) => ({ ...prev, rooms: prev.rooms.filter((item) => item.id !== room.id) }))}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-sm font-bold text-gray-900">Payment split</div>
              <div className="text-xs text-gray-500">Total room estimate: CHF {(total / 100).toFixed(2)}</div>
            </div>
            <div className="text-xs text-gray-500">Slider updates the two CHF amounts only</div>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(180px,2fr)_minmax(0,1fr)] gap-3 items-end">
            <Field label="Conference pays (CHF)">
              <input
                type="number"
                step="0.01"
                value={conferenceValue}
                onChange={(event) => {
                  const nextConference = cents(event.target.value);
                  setForm({
                    ...form,
                    conference_amount: event.target.value,
                    guest_amount: total > 0 ? (Math.max(0, total - nextConference) / 100).toFixed(2) : form.guest_amount,
                  });
                }}
                className={INPUT_CLASS}
              />
            </Field>
            <input
              type="range"
              min="0"
              max={Math.max(total, 0)}
              step="100"
              value={sliderValue}
              onChange={(event) => setPaymentSplit(Number(event.target.value))}
              className="mb-3 w-full"
            />
            <Field label="Guest pays (CHF)">
              <input
                type="number"
                step="0.01"
                value={form.guest_amount}
                onChange={(event) => {
                  const nextGuest = cents(event.target.value);
                  setForm({
                    ...form,
                    guest_amount: event.target.value,
                    conference_amount: total > 0 ? (Math.max(0, total - nextGuest) / 100).toFixed(2) : form.conference_amount,
                  });
                }}
                className={INPUT_CLASS}
              />
            </Field>
          </div>
        </div>

        <Field label="Notes">
          <textarea value={form.admin_notes} onChange={(event) => setForm({ ...form, admin_notes: event.target.value })} rows={3} className={`${INPUT_CLASS} resize-none`} />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer">Cancel</button>
          <button
            onClick={() => onSave(toPayload(form))}
            disabled={isSubmitting || !form.guest_name.trim() || form.rooms.some((room) => !room.hotel_id || !room.room_type_id || !room.check_in_date || !room.check_out_date)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-[#e8d95e] text-black font-medium rounded-lg disabled:opacity-50 cursor-pointer"
          >
            <HotelIcon className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {hotelModal && (
        <CatalogModal title="Add Hotel" onClose={() => setHotelModal(null)} onSave={saveHotelModal} saveDisabled={!hotelModal.name.trim() || !hotelModal.room_name.trim()}>
          <Field label="Hotel name">
            <input value={hotelModal.name} onChange={(event) => setHotelModal({ ...hotelModal, name: event.target.value })} className={INPUT_CLASS} />
          </Field>
          <Field label="Hotel address">
            <input value={hotelModal.address} onChange={(event) => setHotelModal({ ...hotelModal, address: event.target.value })} className={INPUT_CLASS} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Room type">
              <input value={hotelModal.room_name} onChange={(event) => setHotelModal({ ...hotelModal, room_name: event.target.value })} className={INPUT_CLASS} />
            </Field>
            <Field label="Nightly rate (CHF)">
              <input type="number" step="0.01" value={hotelModal.nightly_rate} onChange={(event) => setHotelModal({ ...hotelModal, nightly_rate: event.target.value })} className={INPUT_CLASS} />
            </Field>
            <Field label="People">
              <input type="number" min="1" value={hotelModal.occupancy} onChange={(event) => setHotelModal({ ...hotelModal, occupancy: event.target.value })} className={INPUT_CLASS} />
            </Field>
          </div>
        </CatalogModal>
      )}

      {roomModal && (
        <CatalogModal title="Add Room Type" onClose={() => setRoomModal(null)} onSave={saveRoomModal} saveDisabled={!roomModal.name.trim()}>
          <Field label="Room type">
            <input value={roomModal.name} onChange={(event) => setRoomModal({ ...roomModal, name: event.target.value })} className={INPUT_CLASS} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nightly rate (CHF)">
              <input type="number" step="0.01" value={roomModal.nightly_rate} onChange={(event) => setRoomModal({ ...roomModal, nightly_rate: event.target.value })} className={INPUT_CLASS} />
            </Field>
            <Field label="People">
              <input type="number" min="1" value={roomModal.occupancy} onChange={(event) => setRoomModal({ ...roomModal, occupancy: event.target.value })} className={INPUT_CLASS} />
            </Field>
          </div>
        </CatalogModal>
      )}
    </AdminModal>
  );
}

function RoomLine({
  index,
  room,
  hotels,
  canRemove,
  onChange,
  onRoomTypeChange,
  onAddHotel,
  onAddRoomType,
  onRemove,
}: {
  index: number;
  room: RoomFormData;
  hotels: Hotel[];
  canRemove: boolean;
  onChange: (updates: Partial<RoomFormData>) => void;
  onRoomTypeChange: (value: string) => void;
  onAddHotel: () => void;
  onAddRoomType: (hotelId: string) => void;
  onRemove: () => void;
}) {
  const selectedHotel = hotels.find((hotel) => hotel.id === room.hotel_id);
  const nights = nightsForRoom(room);
  const total = roomTotal(room);

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-gray-900">Room line {index + 1}</div>
        {canRemove && (
          <button type="button" onClick={onRemove} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer" aria-label="Remove room line">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Field label="Hotel">
          <select value={room.hotel_id} onChange={(event) => onChange({ hotel_id: event.target.value, room_type_id: '', room_type_name: '' })} className={INPUT_CLASS}>
            <option value="">Select hotel</option>
            {hotels.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}
          </select>
        </Field>
        <div className="flex items-end">
          <button type="button" onClick={onAddHotel} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 cursor-pointer">
            Add hotel
          </button>
        </div>

        <Field label="Room type">
          <select value={room.room_type_id} onChange={(event) => onRoomTypeChange(event.target.value)} className={INPUT_CLASS} disabled={!room.hotel_id}>
            <option value="">Select room type</option>
            {selectedHotel?.room_types.map((roomType) => <option key={roomType.id} value={roomType.id}>{roomType.name}</option>)}
            <option value={CUSTOM_ROOM_VALUE}>Custom room type</option>
          </select>
        </Field>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => onAddRoomType(room.hotel_id)}
            disabled={!room.hotel_id}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          >
            Add room type
          </button>
        </div>

        {room.room_type_id === CUSTOM_ROOM_VALUE && (
          <>
            <Field label="Custom room type">
              <input value={room.room_type_name} onChange={(event) => onChange({ room_type_name: event.target.value })} placeholder="Double, family, twin" className={INPUT_CLASS} />
            </Field>
            <label className="flex items-end gap-2 text-sm text-gray-700 cursor-pointer pb-2">
              <input type="checkbox" checked={room.save_room_type} onChange={(event) => onChange({ save_room_type: event.target.checked })} className="w-4 h-4" />
              Save room type
            </label>
          </>
        )}

        <Field label="People">
          <input type="number" min="1" value={room.people_count} onChange={(event) => onChange({ people_count: event.target.value })} className={INPUT_CLASS} />
        </Field>

        <Field label="Check-in">
          <input type="date" value={room.check_in_date} onChange={(event) => onChange({ check_in_date: event.target.value })} className={INPUT_CLASS} />
        </Field>
        <Field label={`Check-out${nights > 0 ? ` (${nights} nights)` : ''}`}>
          <input type="date" value={room.check_out_date} onChange={(event) => onChange({ check_out_date: event.target.value })} className={INPUT_CLASS} />
        </Field>
        <Field label="Nightly rate (CHF)">
          <input type="number" step="0.01" value={room.nightly_rate} onChange={(event) => onChange({ nightly_rate: event.target.value })} className={INPUT_CLASS} />
        </Field>
        <div className="flex items-end text-sm text-gray-600">
          Total: CHF {(total / 100).toFixed(2)}
        </div>
      </div>
    </div>
  );
}

function CatalogModal({
  title,
  children,
  onClose,
  onSave,
  saveDisabled,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSave: () => void;
  saveDisabled: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
        </div>
        <div className="space-y-3 p-4">{children}</div>
        <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 cursor-pointer">Cancel</button>
          <button type="button" onClick={onSave} disabled={saveDisabled} className="px-4 py-2 text-sm rounded-lg bg-brand-primary text-black hover:bg-[#e8d95e] disabled:opacity-50 cursor-pointer">Save</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
