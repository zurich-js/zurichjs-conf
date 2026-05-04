/**
 * Arrivals Tab Component
 * Airport pickup planning view - shows inbound flights grouped by arrival hour
 */

import { useState, useMemo } from 'react';
import { ExternalLink, Plane } from 'lucide-react';
import type { FlightWithSpeaker } from '@/lib/cfp/admin-travel';
import { FLIGHT_STATUS_COLORS, getFlightTrackingUrl } from './types';

interface ArrivalsTabProps {
  flights: FlightWithSpeaker[];
  isLoading: boolean;
}

export function ArrivalsTab({ flights, isLoading }: ArrivalsTabProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today
    return new Date().toISOString().split('T')[0];
  });

  // Filter to inbound flights arriving on selected date
  const arrivals = useMemo(() => {
    return flights
      .filter((f) => {
        if (f.direction !== 'inbound' || !f.arrival_time) return false;
        return f.arrival_time.startsWith(selectedDate);
      })
      .sort((a, b) => {
        const ta = a.arrival_time ? new Date(a.arrival_time).getTime() : 0;
        const tb = b.arrival_time ? new Date(b.arrival_time).getTime() : 0;
        return ta - tb;
      });
  }, [flights, selectedDate]);

  // Group by hour
  const hourGroups = useMemo(() => {
    const groups: Record<string, FlightWithSpeaker[]> = {};
    arrivals.forEach((flight) => {
      if (!flight.arrival_time) return;
      const hour = new Date(flight.arrival_time).getHours();
      const key = `${hour.toString().padStart(2, '0')}:00`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(flight);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [arrivals]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-black">Airport Arrivals</h2>
            <p className="text-sm text-gray-500">
              {arrivals.length} speaker{arrivals.length !== 1 ? 's' : ''} arriving on{' '}
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none w-full sm:w-auto"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : arrivals.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <Plane className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No arrivals scheduled for this date</p>
        </div>
      ) : (
        hourGroups.map(([hour, groupFlights]) => (
          <div key={hour} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-700">
                {hour} - {`${(parseInt(hour) + 1).toString().padStart(2, '0')}:00`}
                <span className="ml-2 text-gray-400 font-normal">({groupFlights.length} arrival{groupFlights.length !== 1 ? 's' : ''})</span>
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {groupFlights.map((flight) => {
                const arrivalTime = flight.arrival_time ? new Date(flight.arrival_time) : null;
                const trackingUrl = getFlightTrackingUrl(flight.flight_number, flight.tracking_url);

                return (
                  <div key={flight.id} className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="text-lg font-bold text-gray-900 w-14 flex-shrink-0">
                          {arrivalTime ? arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {flight.speaker.first_name} {flight.speaker.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {flight.airline} {flight.flight_number}
                            <span className="mx-2">·</span>
                            {flight.departure_airport} → {flight.arrival_airport}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-17 sm:ml-0">
                        <span className={`px-2 py-0.5 text-xs rounded capitalize ${FLIGHT_STATUS_COLORS[flight.flight_status]}`}>
                          {flight.flight_status.replace('_', ' ')}
                        </span>
                        {trackingUrl && (
                          <a
                            href={trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            <ExternalLink className="w-3 h-3" /> Track
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
