/**
 * Speakers Tab Component
 * Table view of accepted speakers with travel status
 */

import { Pagination } from '@/components/atoms';
import type { SpeakerWithTravel } from '@/lib/cfp/admin-travel';

interface SpeakersTabProps {
  speakers: SpeakerWithTravel[];
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
}

export function SpeakersTab({ speakers, isLoading, currentPage, onPageChange, pageSize }: SpeakersTabProps) {
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
                  <th className="px-4 py-3">Speaker</th>
                  <th className="px-4 py-3">Talks</th>
                  <th className="px-4 py-3">Arrival</th>
                  <th className="px-4 py-3">Departure</th>
                  <th className="px-4 py-3">Dinner</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedSpeakers.map((speaker) => (
                  <tr key={speaker.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">
                        {speaker.first_name} {speaker.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{speaker.email}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{speaker.accepted_submissions_count}</td>
                    <td className="px-4 py-4 text-gray-600">
                      {speaker.travel?.arrival_date ? new Date(speaker.travel.arrival_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {speaker.travel?.departure_date ? new Date(speaker.travel.departure_date).toLocaleDateString() : '-'}
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
                  </tr>
                ))}
                {paginatedSpeakers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
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
