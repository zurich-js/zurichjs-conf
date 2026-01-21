/**
 * Flights Tab Component
 * Flight tracker with status updates
 */

import { Pagination } from '@/components/atoms';
import type { FlightWithSpeaker } from '@/lib/cfp/admin-travel';
import type { CfpFlightStatus } from '@/lib/types/cfp';
import { FLIGHT_STATUS_COLORS } from './types';

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
}: FlightsTabProps) {
  const totalPages = Math.ceil(filteredFlights.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedFlights = filteredFlights.slice(startIndex, startIndex + pageSize);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-bold text-black">Flight Tracker</h2>
        <div className="flex gap-2">
          {(['all', 'inbound', 'outbound'] as const).map((dir) => (
            <button
              key={dir}
              onClick={() => setFlightDirection(dir)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors capitalize ${
                flightDirection === dir ? 'bg-[#F1E271] text-black' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {dir}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-gray-500">
                <tr>
                  <th className="px-4 py-3">Speaker</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Flight</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedFlights.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No flights found
                    </td>
                  </tr>
                ) : (
                  paginatedFlights.map((flight) => (
                    <tr key={flight.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 font-medium text-gray-900">
                        {flight.speaker.first_name} {flight.speaker.last_name}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded capitalize ${
                            flight.direction === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {flight.direction}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {flight.airline} {flight.flight_number}
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {flight.departure_airport} → {flight.arrival_airport}
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {flight.departure_time ? new Date(flight.departure_time).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 text-xs rounded capitalize ${FLIGHT_STATUS_COLORS[flight.flight_status]}`}>
                          {flight.flight_status.replace('_', ' ')}
                        </span>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={pageSize}
            totalItems={filteredFlights.length}
            variant="light"
          />
        </>
      )}
    </div>
  );
}
