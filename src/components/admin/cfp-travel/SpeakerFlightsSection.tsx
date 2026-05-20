/**
 * Speaker Flights Section
 * Manage flights for a speaker within the detail modal
 */

import { useState } from 'react';
import { Plane, ExternalLink, Pencil, Trash2, Plus } from 'lucide-react';
import type { CfpSpeakerFlight } from '@/lib/types/cfp';
import type { SpeakerWithTravel } from '@/lib/cfp/admin-travel';
import { FlightModal } from './FlightModal';
import { FLIGHT_STATUS_COLORS, getFlightTrackingUrl } from './types';

interface SpeakerFlightsSectionProps {
  flights: CfpSpeakerFlight[];
  unlinkedFlights?: CfpSpeakerFlight[];
  speaker: SpeakerWithTravel;
  speakerId: string;
  onCreateFlight: (data: Record<string, unknown>) => void;
  onUpdateFlight: (flightId: string, data: Record<string, unknown>) => void;
  onDeleteFlight: (flightId: string) => void;
  onLinkFlight: (flightId: string) => void;
  isSubmitting: boolean;
}

export function SpeakerFlightsSection({
  flights,
  unlinkedFlights = [],
  speaker,
  onCreateFlight,
  onUpdateFlight,
  onDeleteFlight,
  onLinkFlight,
  isSubmitting,
}: SpeakerFlightsSectionProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [linkFlightId, setLinkFlightId] = useState('');
  const [editing, setEditing] = useState<CfpSpeakerFlight | null>(null);

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
        {!isCreating && !editing && (
          <div className="flex gap-2">
            {unlinkedFlights.length > 0 && (
              <button
                onClick={() => setShowLink((value) => !value)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Link flight
              </button>
            )}
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-primary text-black hover:bg-[#e8d95e] cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add Flight
            </button>
          </div>
        )}
      </div>

      {showLink && (
        <div className="mb-3 border border-gray-200 rounded-lg p-3 bg-gray-50 flex flex-col sm:flex-row gap-2">
          <select value={linkFlightId} onChange={(event) => setLinkFlightId(event.target.value)} className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none">
            <option value="">Select unlinked flight</option>
            {unlinkedFlights.map((flight) => (
              <option key={flight.id} value={flight.id}>
                {(flight.traveler_name || 'Other')} · {flight.airline || ''} {flight.flight_number || ''} · {flight.departure_airport || '?'} → {flight.arrival_airport || '?'}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (!linkFlightId) return;
              onLinkFlight(linkFlightId);
              setLinkFlightId('');
              setShowLink(false);
            }}
            disabled={!linkFlightId || isSubmitting}
            className="px-3 py-2 text-sm rounded-lg bg-brand-primary text-black hover:bg-[#e8d95e] disabled:opacity-50 cursor-pointer"
          >
            Link
          </button>
        </div>
      )}

      {flights.length === 0 && !isCreating && !editing && (
        <p className="text-sm text-gray-500 py-3">No flights added yet.</p>
      )}

      {flights.map((flight) => {
        const trackingUrl = getFlightTrackingUrl(flight.flight_number, flight.tracking_url);
        return (
          <div key={flight.id} className="border border-gray-200 rounded-lg p-3 mb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                <span className={`px-2 py-0.5 text-xs rounded capitalize ${
                  flight.direction === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {flight.direction}
                </span>
                <span className="font-medium text-gray-900 text-sm">
                  {flight.airline} {flight.flight_number}
                </span>
                {flight.traveler_name && (
                  <span className="text-xs text-gray-400">{flight.traveler_name}</span>
                )}
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
                <button onClick={() => setEditing(flight)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer" title="Edit">
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

      {(isCreating || editing) && (
        <FlightModal
          flight={editing}
          defaultSpeaker={speaker}
          speakers={[speaker]}
          isSubmitting={isSubmitting}
          onClose={() => { setIsCreating(false); setEditing(null); }}
          onSave={(data) => {
            if (editing) onUpdateFlight(editing.id, data);
            else onCreateFlight(data);
            setIsCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
