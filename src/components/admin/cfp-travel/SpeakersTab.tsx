/**
 * Speakers Tab Component
 * Table view of accepted speakers with travel status, flights, hotel, and nights
 */

import { Check, X, Eye } from 'lucide-react';
import { Pagination } from '@/components/atoms';
import type { SpeakerWithTravel } from '@/lib/cfp/admin-travel';
import { calculateNights } from './types';

interface SpeakersTabProps {
  speakers: SpeakerWithTravel[];
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onSelectSpeaker: (speaker: SpeakerWithTravel) => void;
}

function StatusDot({ speaker }: { speaker: SpeakerWithTravel }) {
  const hasFlights = speaker.flights.length > 0;
  const hasHotel = !!speaker.accommodation?.hotel_name;

  if (hasFlights && hasHotel) {
    return <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" title="Flights & hotel booked" />;
  }
  if (hasFlights || hasHotel) {
    return <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500" title="Partially complete" />;
  }
  return <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300" title="Nothing booked" />;
}

export function SpeakersTab({ speakers, isLoading, currentPage, onPageChange, pageSize, onSelectSpeaker }: SpeakersTabProps) {
  const totalPages = Math.ceil(speakers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSpeakers = speakers.slice(startIndex, startIndex + pageSize);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-black">Accepted Speakers ({speakers.length})</h2>
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
                  <th className="px-4 py-3 w-8"></th>
                  <th className="px-4 py-3">Speaker</th>
                  <th className="px-4 py-3">Talks</th>
                  <th className="px-4 py-3">Flights</th>
                  <th className="px-4 py-3">Hotel</th>
                  <th className="px-4 py-3">Nights</th>
                  <th className="px-4 py-3">Dinner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedSpeakers.map((speaker) => {
                  const nights = calculateNights(
                    speaker.accommodation?.check_in_date ?? null,
                    speaker.accommodation?.check_out_date ?? null
                  );

                  return (
                    <tr
                      key={speaker.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => onSelectSpeaker(speaker)}
                    >
                      <td className="px-4 py-4">
                        <StatusDot speaker={speaker} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">
                          {speaker.first_name} {speaker.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{speaker.email}</div>
                      </td>
                      <td className="px-4 py-4 text-gray-600">{speaker.accepted_submissions_count}</td>
                      <td className="px-4 py-4">
                        {speaker.flights.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <Check className="w-4 h-4" />
                            <span className="text-sm">{speaker.flights.length}</span>
                          </span>
                        ) : (
                          <X className="w-4 h-4 text-gray-300" />
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {speaker.accommodation?.hotel_name ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <Check className="w-4 h-4" />
                          </span>
                        ) : (
                          <X className="w-4 h-4 text-gray-300" />
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {nights !== null ? nights : '-'}
                      </td>
                      <td className="px-4 py-4">
                        {speaker.travel?.attending_speakers_dinner ? (
                          <span className="text-green-600">Yes</span>
                        ) : speaker.travel?.attending_speakers_dinner === false ? (
                          <span className="text-red-600">No</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {speaker.travel?.travel_confirmed ? (
                          <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Confirmed</span>
                        ) : speaker.travel ? (
                          <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">In Progress</span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">Not Started</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSpeaker(speaker);
                          }}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {paginatedSpeakers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No accepted speakers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={pageSize}
            totalItems={speakers.length}
            variant="light"
          />
        </>
      )}
    </div>
  );
}
