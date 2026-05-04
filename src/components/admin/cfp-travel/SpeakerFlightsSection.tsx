/**
 * Speaker Flights Section
 * Manage flights for a speaker within the detail modal
 */

import { useState } from 'react';
import { Plane, ExternalLink, Pencil, Trash2, Plus } from 'lucide-react';
import type { CfpSpeakerFlight, CfpFlightDirection } from '@/lib/types/cfp';
import { FLIGHT_STATUS_COLORS, getFlightTrackingUrl } from './types';

interface SpeakerFlightsSectionProps {
  flights: CfpSpeakerFlight[];
  speakerId: string;
  onCreateFlight: (data: Record<string, unknown>) => void;
  onUpdateFlight: (flightId: string, data: Record<string, unknown>) => void;
  onDeleteFlight: (flightId: string) => void;
  isSubmitting: boolean;
}

interface FlightFormData {
  direction: CfpFlightDirection;
  airline: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  booking_reference: string;
}

const EMPTY_FORM: FlightFormData = {
  direction: 'inbound',
  airline: '',
  flight_number: '',
  departure_airport: '',
  arrival_airport: '',
  departure_time: '',
  arrival_time: '',
  booking_reference: '',
};

export function SpeakerFlightsSection({
  flights,
  onCreateFlight,
  onUpdateFlight,
  onDeleteFlight,
  isSubmitting,
}: SpeakerFlightsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FlightFormData>(EMPTY_FORM);

  const startAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (flight: CfpSpeakerFlight) => {
    setForm({
      direction: flight.direction,
      airline: flight.airline || '',
      flight_number: flight.flight_number || '',
      departure_airport: flight.departure_airport || '',
      arrival_airport: flight.arrival_airport || '',
      departure_time: flight.departure_time ? flight.departure_time.slice(0, 16) : '',
      arrival_time: flight.arrival_time ? flight.arrival_time.slice(0, 16) : '',
      booking_reference: flight.booking_reference || '',
    });
    setEditingId(flight.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    const data = {
      direction: form.direction,
      airline: form.airline || undefined,
      flight_number: form.flight_number || undefined,
      departure_airport: form.departure_airport || undefined,
      arrival_airport: form.arrival_airport || undefined,
      departure_time: form.departure_time ? new Date(form.departure_time).toISOString() : undefined,
      arrival_time: form.arrival_time ? new Date(form.arrival_time).toISOString() : undefined,
      booking_reference: form.booking_reference || undefined,
    };

    if (editingId) {
      onUpdateFlight(editingId, data);
    } else {
      onCreateFlight(data);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (flightId: string) => {
    if (confirm('Delete this flight?')) {
      onDeleteFlight(flightId);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Plane className="w-4 h-4" />
          Flights ({flights.length})
        </h3>
        {!showForm && (
          <button
            onClick={startAdd}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-primary text-black hover:bg-[#e8d95e] cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Add Flight
          </button>
        )}
      </div>

      {flights.length === 0 && !showForm && (
        <p className="text-sm text-gray-500 py-3">No flights added yet.</p>
      )}

      {flights.map((flight) => {
        const trackingUrl = getFlightTrackingUrl(flight.flight_number, flight.tracking_url);
        return (
          <div key={flight.id} className="border border-gray-200 rounded-lg p-3 mb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`px-2 py-0.5 text-xs rounded capitalize ${
                  flight.direction === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {flight.direction}
                </span>
                <span className="font-medium text-gray-900 text-sm">
                  {flight.airline} {flight.flight_number}
                </span>
                <span className="text-sm text-gray-500">
                  {flight.departure_airport} → {flight.arrival_airport}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className={`px-2 py-0.5 text-xs rounded capitalize ${FLIGHT_STATUS_COLORS[flight.flight_status]}`}>
                  {flight.flight_status.replace('_', ' ')}
                </span>
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"
                    title="Track flight"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button onClick={() => startEdit(flight)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer" title="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(flight.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600 cursor-pointer" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="mt-1.5 text-xs text-gray-500 flex gap-4">
              <span>Departs: {flight.departure_time ? new Date(flight.departure_time).toLocaleString() : 'TBD'}</span>
              <span>Arrives: {flight.arrival_time ? new Date(flight.arrival_time).toLocaleString() : 'TBD'}</span>
              {flight.booking_reference && <span>Ref: {flight.booking_reference}</span>}
            </div>
          </div>
        );
      })}

      {showForm && (
        <div className="border border-gray-200 rounded-lg p-4 mt-2 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            {editingId ? 'Edit Flight' : 'Add Flight'}
          </h4>
          <div className="space-y-3">
            <div className="flex gap-4">
              {(['inbound', 'outbound'] as const).map((d) => (
                <label key={d} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="direction"
                    checked={form.direction === d}
                    onChange={() => setForm({ ...form, direction: d })}
                    className="w-4 h-4 text-brand-primary"
                  />
                  <span className="text-sm capitalize">{d}</span>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Airline (e.g. Swiss)"
                value={form.airline}
                onChange={(e) => setForm({ ...form, airline: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              />
              <input
                placeholder="Flight # (e.g. LX123)"
                value={form.flight_number}
                onChange={(e) => setForm({ ...form, flight_number: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="From (e.g. LHR)"
                value={form.departure_airport}
                onChange={(e) => setForm({ ...form, departure_airport: e.target.value.toUpperCase() })}
                maxLength={4}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              />
              <input
                placeholder="To (e.g. ZRH)"
                value={form.arrival_airport}
                onChange={(e) => setForm({ ...form, arrival_airport: e.target.value.toUpperCase() })}
                maxLength={4}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Departure</label>
                <input
                  type="datetime-local"
                  value={form.departure_time}
                  onChange={(e) => setForm({ ...form, departure_time: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Arrival</label>
                <input
                  type="datetime-local"
                  value={form.arrival_time}
                  onChange={(e) => setForm({ ...form, arrival_time: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                />
              </div>
            </div>
            <input
              placeholder="Booking Reference"
              value={form.booking_reference}
              onChange={(e) => setForm({ ...form, booking_reference: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-brand-primary text-black hover:bg-[#e8d95e] disabled:opacity-50 cursor-pointer"
              >
                {editingId ? 'Update' : 'Add'} Flight
              </button>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
