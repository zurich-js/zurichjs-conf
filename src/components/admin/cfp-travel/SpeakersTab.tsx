/**
 * Speaker travel operations overview.
 * Non-speaker travelers are managed from the Flights tab.
 */

import { Check, PlaneLanding, PlaneTakeoff, Receipt, Search } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Pagination } from '@/components/atoms';
import type { SpeakerWithTravel } from '@/lib/cfp/admin-travel';
import {
  deriveTravelWindowFromFlights,
  formatExpenseTotals,
  formatTravelDate,
} from './types';

interface SpeakersTabProps {
  speakers: SpeakerWithTravel[];
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onSelectSpeaker: (speaker: SpeakerWithTravel) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

interface SpeakerOperations {
  arrival: string | null;
  departure: string | null;
  expenses: string;
}

function getSpeakerOperations(speaker: SpeakerWithTravel): SpeakerOperations {
  const travelWindow = deriveTravelWindowFromFlights(speaker.flights);
  return {
    ...travelWindow,
    expenses: formatExpenseTotals(speaker.reimbursements),
  };
}

function CompletionValue({ value, missingLabel }: { value: string | null; missingLabel: string }) {
  if (!value) {
    return <span className="text-sm text-gray-400">{missingLabel}</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-800">
      <Check className="w-4 h-4 text-green-600" aria-hidden="true" />
      {value}
    </span>
  );
}

function MobileDetail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-gray-50 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-sm text-gray-800">{children}</div>
    </div>
  );
}

export function SpeakersTab({
  speakers,
  isLoading,
  currentPage,
  onPageChange,
  pageSize,
  onSelectSpeaker,
  searchQuery,
  onSearchChange,
}: SpeakersTabProps) {
  const filteredSpeakers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return speakers;
    return speakers.filter((speaker) => {
      const searchable = `${speaker.first_name ?? ''} ${speaker.last_name ?? ''} ${speaker.email ?? ''}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [speakers, searchQuery]);

  const totalPages = Math.ceil(filteredSpeakers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSpeakers = filteredSpeakers.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    if (currentPage > 1 && startIndex >= filteredSpeakers.length) {
      onPageChange(1);
    }
  }, [filteredSpeakers.length, currentPage, startIndex, onPageChange]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-black">
            Speaker travel ({filteredSpeakers.length}{searchQuery ? ` of ${speakers.length}` : ''})
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Inbound flights, outbound flights, and expenses for program speakers.
          </p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name or email"
            aria-label="Search speaker travel"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12" role="status" aria-label="Loading speaker travel">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
        </div>
      ) : (
        <>
          <div className="sm:hidden divide-y divide-gray-200">
            {paginatedSpeakers.map((speaker) => {
              const operations = getSpeakerOperations(speaker);
              return (
                <button
                  key={speaker.id}
                  type="button"
                  onClick={() => onSelectSpeaker(speaker)}
                  className="block w-full p-4 text-left active:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-yellow-400"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">
                      {speaker.first_name} {speaker.last_name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{speaker.email}</div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <MobileDetail icon={<PlaneLanding className="w-3.5 h-3.5" aria-hidden="true" />} label="Inbound">
                      {operations.arrival ? formatTravelDate(operations.arrival) : 'Not added'}
                    </MobileDetail>
                    <MobileDetail icon={<PlaneTakeoff className="w-3.5 h-3.5" aria-hidden="true" />} label="Outbound">
                      {operations.departure ? formatTravelDate(operations.departure) : 'Not added'}
                    </MobileDetail>
                    <MobileDetail icon={<Receipt className="w-3.5 h-3.5" aria-hidden="true" />} label="Expenses">
                      {operations.expenses}
                    </MobileDetail>
                  </div>
                </button>
              );
            })}
            {paginatedSpeakers.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">No speakers found</div>
            )}
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-gray-500">
                <tr>
                  <th className="px-5 py-3">Speaker</th>
                  <th className="px-4 py-3">Inbound</th>
                  <th className="px-4 py-3">Outbound</th>
                  <th className="px-4 py-3">Expenses</th>
                  <th className="px-5 py-3 text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedSpeakers.map((speaker) => {
                  const operations = getSpeakerOperations(speaker);
                  return (
                    <tr key={speaker.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900">{speaker.first_name} {speaker.last_name}</div>
                        <div className="text-sm text-gray-500">{speaker.email}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <CompletionValue
                          value={operations.arrival ? formatTravelDate(operations.arrival) : null}
                          missingLabel="Not added"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <CompletionValue
                          value={operations.departure ? formatTravelDate(operations.departure) : null}
                          missingLabel="Not added"
                        />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">{operations.expenses}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectSpeaker(speaker)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-primary text-black hover:brightness-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {paginatedSpeakers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No speakers found</td>
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
            totalItems={filteredSpeakers.length}
            variant="light"
          />
        </>
      )}
    </div>
  );
}
