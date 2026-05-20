import { useState, type ReactNode } from 'react';
import { Plane } from 'lucide-react';
import { AdminModal } from '@/components/admin/AdminModal';
import type { CfpFlightDirection, CfpFlightStatus } from '@/lib/types/cfp';
import type { FlightWithSpeaker, SpeakerWithTravel } from '@/lib/cfp/admin-travel';

const INPUT_CLASS = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none';
const OTHER_VALUE = '__other__';

interface FlightFormData {
  traveler_for: string;
  traveler_name: string;
  traveler_email: string;
  direction: CfpFlightDirection;
  airline: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  booking_reference: string;
  tracking_url: string;
  flight_status: CfpFlightStatus;
}

interface FlightModalProps {
  flight: FlightWithSpeaker | null;
  defaultSpeaker?: SpeakerWithTravel | null;
  speakers: SpeakerWithTravel[];
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
}

function toLocalDateTime(value: string | null): string {
  return value ? value.slice(0, 16) : '';
}

function buildForm(flight: FlightWithSpeaker | null, defaultSpeaker?: SpeakerWithTravel | null): FlightFormData {
  return {
    traveler_for: flight?.speaker_id ?? defaultSpeaker?.id ?? (flight ? OTHER_VALUE : ''),
    traveler_name: flight?.traveler_name ?? (defaultSpeaker ? `${defaultSpeaker.first_name} ${defaultSpeaker.last_name}` : ''),
    traveler_email: flight?.traveler_email ?? defaultSpeaker?.email ?? '',
    direction: flight?.direction ?? 'inbound',
    airline: flight?.airline ?? '',
    flight_number: flight?.flight_number ?? '',
    departure_airport: flight?.departure_airport ?? '',
    arrival_airport: flight?.arrival_airport ?? '',
    departure_time: toLocalDateTime(flight?.departure_time ?? null),
    arrival_time: toLocalDateTime(flight?.arrival_time ?? null),
    booking_reference: flight?.booking_reference ?? '',
    tracking_url: flight?.tracking_url ?? '',
    flight_status: flight?.flight_status ?? 'confirmed',
  };
}

function toIso(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

export function FlightModal({ flight, defaultSpeaker, speakers, isSubmitting, onClose, onSave }: FlightModalProps) {
  const [form, setForm] = useState<FlightFormData>(() => buildForm(flight, defaultSpeaker));

  const handleTravelerFor = (value: string) => {
    const speaker = speakers.find((item) => item.id === value);
    setForm((prev) => ({
      ...prev,
      traveler_for: value,
      traveler_name: speaker ? `${speaker.first_name} ${speaker.last_name}` : prev.traveler_name,
      traveler_email: speaker?.email ?? prev.traveler_email,
    }));
  };

  const payload = (): Record<string, unknown> => ({
    speaker_id: form.traveler_for && form.traveler_for !== OTHER_VALUE ? form.traveler_for : null,
    traveler_name: form.traveler_name || null,
    traveler_email: form.traveler_email || null,
    direction: form.direction,
    airline: form.airline || null,
    flight_number: form.flight_number || null,
    departure_airport: form.departure_airport || null,
    arrival_airport: form.arrival_airport || null,
    departure_time: toIso(form.departure_time),
    arrival_time: toIso(form.arrival_time),
    booking_reference: form.booking_reference || null,
    tracking_url: form.tracking_url || null,
    flight_status: form.flight_status,
  });

  return (
    <AdminModal onClose={onClose} title={flight ? 'Edit Flight' : 'Add Flight'} subtitle="Track speaker and non-speaker flights" size="2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Flight for">
            <select value={form.traveler_for} onChange={(event) => handleTravelerFor(event.target.value)} className={INPUT_CLASS}>
              <option value="">Select an option</option>
              <option value={OTHER_VALUE}>Other</option>
              <option disabled>──────────</option>
              {speakers.map((speaker) => (
                <option key={speaker.id} value={speaker.id}>{speaker.first_name} {speaker.last_name}</option>
              ))}
            </select>
          </Field>
          <Field label="Direction">
            <select value={form.direction} onChange={(event) => setForm({ ...form, direction: event.target.value as CfpFlightDirection })} className={INPUT_CLASS}>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
          </Field>
          <Field label="Traveler name">
            <input value={form.traveler_name} onChange={(event) => setForm({ ...form, traveler_name: event.target.value })} className={INPUT_CLASS} />
          </Field>
          <Field label="Traveler email">
            <input type="email" value={form.traveler_email} onChange={(event) => setForm({ ...form, traveler_email: event.target.value })} className={INPUT_CLASS} />
          </Field>
          <Field label="Airline">
            <input value={form.airline} onChange={(event) => setForm({ ...form, airline: event.target.value })} placeholder="Swiss" className={INPUT_CLASS} />
          </Field>
          <Field label="Flight #">
            <input value={form.flight_number} onChange={(event) => setForm({ ...form, flight_number: event.target.value })} placeholder="LX123" className={INPUT_CLASS} />
          </Field>
          <Field label="From">
            <input value={form.departure_airport} onChange={(event) => setForm({ ...form, departure_airport: event.target.value.toUpperCase() })} maxLength={4} placeholder="LHR" className={INPUT_CLASS} />
          </Field>
          <Field label="To">
            <input value={form.arrival_airport} onChange={(event) => setForm({ ...form, arrival_airport: event.target.value.toUpperCase() })} maxLength={4} placeholder="ZRH" className={INPUT_CLASS} />
          </Field>
          <Field label="Departure">
            <input type="datetime-local" value={form.departure_time} onChange={(event) => setForm({ ...form, departure_time: event.target.value })} className={INPUT_CLASS} />
          </Field>
          <Field label="Arrival">
            <input type="datetime-local" value={form.arrival_time} onChange={(event) => setForm({ ...form, arrival_time: event.target.value })} className={INPUT_CLASS} />
          </Field>
          <Field label="Booking reference">
            <input value={form.booking_reference} onChange={(event) => setForm({ ...form, booking_reference: event.target.value })} className={INPUT_CLASS} />
          </Field>
          <Field label="Tracking URL">
            <input value={form.tracking_url} onChange={(event) => setForm({ ...form, tracking_url: event.target.value })} className={INPUT_CLASS} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer">Cancel</button>
          <button
            type="button"
            onClick={() => onSave(payload())}
            disabled={isSubmitting || !form.traveler_name.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-[#e8d95e] text-black font-medium rounded-lg disabled:opacity-50 cursor-pointer"
          >
            <Plane className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
    </AdminModal>
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
