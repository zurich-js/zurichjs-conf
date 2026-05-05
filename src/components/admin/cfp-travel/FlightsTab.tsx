/**
 * Flights Tab Component
 * Flight tracker with status updates and tracking links
 */

import { ExternalLink, Search } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Pagination } from '@/components/atoms';
import type { FlightWithSpeaker } from '@/lib/cfp/admin-travel';
import type { CfpFlightStatus } from '@/lib/types/cfp';
import { FLIGHT_STATUS_COLORS, getFlightTrackingUrl } from './types';

interface FlightsTabProps {
  flights: FlightWithSpeaker[];
  filteredFlights: FlightWithSpeaker[];
  isLoading: boolean;
  flightDirection: 'all' | 'inbound' | 'outbound';
  setFlightDirection: (dir: 'all' | 'inbound' | 'outbound') => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onUpdateStatus: (id: string, status: CfpFlightStatus) => void;
  isUpdating: boolean;
  onSelectSpeaker?: (speakerId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function FlightsTab({
  filteredFlights,
  isLoading,
  flightDirection,
  setFlightDirection,
  currentPage,
  onPageChange,
  pageSize,
  onUpdateStatus,
  isUpdating,
  onSelectSpeaker,
  searchQuery,
  onSearchChange,
}: FlightsTabProps) {
  const searchedFlights = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredFlights;
    return filteredFlights.filter((f) => {
      const haystack = [
        f.speaker.first_name,
        f.speaker.last_name,
        f.speaker.email,
        f.airline,
        f.flight_number,
        f.departure_airport,
        f.arrival_airport,
        f.booking_reference,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [filteredFlights, searchQuery]);

  const totalPages = Math.ceil(searchedFlights.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedFlights = searchedFlights.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    if (currentPage > 1 && startIndex >= searchedFlights.length) {
      onPageChange(1);
    }
  }, [searchedFlights.length, currentPage, startIndex, onPageChange]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-black">
            Flight Tracker ({searchedFlights.length}{searchQuery ? ` of ${filteredFlights.length}` : ''})
          </h2>
          <div className="flex gap-2">
            {(['all', 'inbound', 'outbound'] as const).map((dir) => (
              <button
                key={dir}
                onClick={() => setFlightDirection(dir)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors capitalize cursor-pointer ${
                  flightDirection === dir ? 'bg-brand-primary text-black' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {dir}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by speaker, airline, flight number, airport, booking ref..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
          />
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <>
          {/* Mobile: Card layout */}
          <div className="sm:hidden divide-y divide-gray-200">
            {paginatedFlights.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">No flights found</div>
            ) : (
              paginatedFlights.map((flight) => {
                const trackingUrl = getFlightTrackingUrl(flight.flight_number, flight.tracking_url);
                return (
                  <div key={flight.id} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        {onSelectSpeaker ? (
                          <button
                            onClick={() => onSelectSpeaker(flight.speaker.id)}
                            className="font-medium text-blue-600 text-sm cursor-pointer"
                          >
                            {flight.speaker.first_name} {flight.speaker.last_name}
                          </button>
                        ) : (
                          <span className="font-medium text-gray-900 text-sm">
                            {flight.speaker.first_name} {flight.speaker.last_name}
                          </span>
                        )}
                        <div className="text-xs text-gray-500 mt-0.5">
                          {flight.airline} {flight.flight_number}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded capitalize flex-shrink-0 ${
                        flight.direction === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {flight.direction}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {flight.departure_airport} → {flight.arrival_airport}
                      <span className="mx-2">·</span>
                      {flight.departure_time ? new Date(flight.departure_time).toLocaleString() : 'TBD'}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded capitalize ${FLIGHT_STATUS_COLORS[flight.flight_status]}`}>
                          {flight.flight_status.replace('_', ' ')}
                        </span>
                        {trackingUrl && (
                          <a
                            href={trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700"
                          >
                            <ExternalLink className="w-3 h-3" /> Track
                          </a>
                        )}
                      </div>
                      <select
                        value={flight.flight_status}
                        onChange={(e) => onUpdateStatus(flight.id, e.target.value as CfpFlightStatus)}
                        disabled={isUpdating}
                        className="text-xs px-2 py-1 rounded border border-gray-300 focus:ring-2 focus:ring-yellow-400 focus:outline-none disabled:opacity-50"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="checked_in">Checked In</option>
                        <option value="boarding">Boarding</option>
                        <option value="departed">Departed</option>
                        <option value="arrived">Arrived</option>
                        <option value="delayed">Delayed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-gray-500">
                <tr>
                  <th className="px-4 py-3">Speaker</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Flight</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Track</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedFlights.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No flights found</td>
                  </tr>
                ) : (
                  paginatedFlights.map((flight) => {
                    const trackingUrl = getFlightTrackingUrl(flight.flight_number, flight.tracking_url);
                    return (
                      <tr key={flight.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          {onSelectSpeaker ? (
                            <button
                              onClick={() => onSelectSpeaker(flight.speaker.id)}
                              className="font-medium text-blue-600 hover:underline cursor-pointer text-left"
                            >
                              {flight.speaker.first_name} {flight.speaker.last_name}
                            </button>
                          ) : (
                            <span className="font-medium text-gray-900">
                              {flight.speaker.first_name} {flight.speaker.last_name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 text-xs rounded capitalize ${
                            flight.direction === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {flight.direction}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-600">{flight.airline} {flight.flight_number}</td>
                        <td className="px-4 py-4 text-gray-600">{flight.departure_airport} → {flight.arrival_airport}</td>
                        <td className="px-4 py-4 text-gray-600">
                          {flight.departure_time ? new Date(flight.departure_time).toLocaleString() : '-'}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 text-xs rounded capitalize ${FLIGHT_STATUS_COLORS[flight.flight_status]}`}>
                            {flight.flight_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {trackingUrl ? (
                            <a
                              href={trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                            >
                              <ExternalLink className="w-3 h-3" /> Track
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={flight.flight_status}
                            onChange={(e) => onUpdateStatus(flight.id, e.target.value as CfpFlightStatus)}
                            disabled={isUpdating}
                            className="text-sm px-2 py-1 rounded border border-gray-300 focus:ring-2 focus:ring-yellow-400 focus:outline-none disabled:opacity-50"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="checked_in">Checked In</option>
                            <option value="boarding">Boarding</option>
                            <option value="departed">Departed</option>
                            <option value="arrived">Arrived</option>
                            <option value="delayed">Delayed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={pageSize}
            totalItems={searchedFlights.length}
            variant="light"
          />
        </>
      )}
    </div>
  );
}
