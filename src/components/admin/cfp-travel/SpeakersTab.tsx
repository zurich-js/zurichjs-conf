/**
 * Speakers Tab Component
 * Program speaker roster with editable travel-attendance planning fields
 */

import { useMemo, useState } from 'react';
import { Filter } from 'lucide-react';
import { Pagination } from '@/components/atoms';
import type { SpeakerWithTravel } from '@/lib/cfp/admin-travel';
import { cycleMultiSort, getMultiSortDirection, SortIndicator, type MultiSort } from '@/components/admin/cfp/tableSort';
import { attendanceValueToSelect, selectToAttendanceValue } from './types';
import { formatDate } from './format';

type SpeakerSortKey = 'speaker' | 'sessions' | 'travel' | 'location';

interface SpeakersTabProps {
  speakers: SpeakerWithTravel[];
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onUpdateSpeakerTravel: (
    speakerId: string,
    updates: {
      attending_speakers_dinner?: boolean | null;
      attending_after_party?: boolean | null;
      attending_post_conf?: boolean | null;
      travel_confirmed?: boolean;
    }
  ) => void;
  updatingSpeakerId: string | null;
}

export function SpeakersTab({
  speakers,
  isLoading,
  currentPage,
  onPageChange,
  pageSize,
  onUpdateSpeakerTravel,
  updatingSpeakerId,
}: SpeakersTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [travelFilter, setTravelFilter] = useState<'all' | 'confirmed' | 'pending'>('all');
  const [sort, setSort] = useState<MultiSort<SpeakerSortKey>>([]);

  const filteredSpeakers = useMemo(() => {
    let next = speakers.filter((speaker) => {
      const matchesSearch =
        `${speaker.first_name} ${speaker.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        [speaker.city, speaker.country].filter(Boolean).join(' ').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTravel =
        travelFilter === 'all' ||
        (travelFilter === 'confirmed' && Boolean(speaker.travel?.travel_confirmed)) ||
        (travelFilter === 'pending' && !speaker.travel?.travel_confirmed);

      return matchesSearch && matchesTravel;
    });

    if (sort.length > 0) {
      next = [...next].sort((a, b) => {
        for (const rule of sort) {
          const dir = rule.direction === 'asc' ? 1 : -1;
          let comparison = 0;

          if (rule.key === 'speaker') {
            comparison = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
          } else if (rule.key === 'sessions') {
            comparison = a.program_sessions_count - b.program_sessions_count;
          } else if (rule.key === 'travel') {
            comparison = Number(Boolean(a.travel?.travel_confirmed)) - Number(Boolean(b.travel?.travel_confirmed));
          } else if (rule.key === 'location') {
            comparison = [a.city, a.country].filter(Boolean).join(', ').localeCompare([b.city, b.country].filter(Boolean).join(', '));
          }

          if (comparison !== 0) return comparison * dir;
        }
        return 0;
      });
    }

    return next;
  }, [speakers, searchQuery, travelFilter, sort]);

  const totalPages = Math.ceil(filteredSpeakers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSpeakers = filteredSpeakers.slice(startIndex, startIndex + pageSize);

  const handleSortClick = (key: SpeakerSortKey) => setSort(cycleMultiSort(sort, key));

  return (
      <div className="space-y-4">
          <div className="px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Filter className="h-4 w-4 text-brand-gray-medium" />
            <span>
              Showing <span className="font-semibold text-black">{filteredSpeakers.length}</span> speaker{filteredSpeakers.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                onPageChange(1);
              }}
              placeholder="Search speakers or location..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary lg:w-80"
            />
            <select
              value={travelFilter}
              onChange={(event) => {
                setTravelFilter(event.target.value as typeof travelFilter);
                onPageChange(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="all">All travel states</option>
              <option value="confirmed">Travel confirmed</option>
              <option value="pending">Travel pending</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-gray-50 text-left text-sm text-gray-500">
              <tr>
                <SortableHeader label="Speaker" sortKey="speaker" sort={sort} onClick={handleSortClick} />
                <SortableHeader label="Location" sortKey="location" sort={sort} onClick={handleSortClick} />
                <SortableHeader label="Sessions" sortKey="sessions" sort={sort} onClick={handleSortClick} />
                <th className="px-4 py-3">Dinner</th>
                <th className="px-4 py-3">After-party</th>
                <th className="px-4 py-3">Post-conf</th>
                <SortableHeader label="Travel Confirmed" sortKey="travel" sort={sort} onClick={handleSortClick} />
                <th className="px-4 py-3">Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">Loading speakers...</td>
                </tr>
              ) : paginatedSpeakers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">No managed speakers found</td>
                </tr>
              ) : (
                paginatedSpeakers.map((speaker) => (
                  <tr key={speaker.id} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="font-medium text-black">{speaker.first_name} {speaker.last_name}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {[speaker.city, speaker.country].filter(Boolean).join(', ') || 'Location not set'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{speaker.program_sessions_count}</td>
                    <td className="px-4 py-4">
                      <AttendanceSelect
                        value={speaker.travel?.attending_speakers_dinner}
                        onChange={(value) => onUpdateSpeakerTravel(speaker.id, { attending_speakers_dinner: value })}
                        disabled={updatingSpeakerId === speaker.id}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <AttendanceSelect
                        value={speaker.attending_after_party}
                        onChange={(value) => onUpdateSpeakerTravel(speaker.id, { attending_after_party: value })}
                        disabled={updatingSpeakerId === speaker.id}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <AttendanceSelect
                        value={speaker.attending_post_conf}
                        onChange={(value) => onUpdateSpeakerTravel(speaker.id, { attending_post_conf: value })}
                        disabled={updatingSpeakerId === speaker.id}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={speaker.travel?.travel_confirmed ? 'yes' : 'no'}
                        onChange={(event) => onUpdateSpeakerTravel(speaker.id, { travel_confirmed: event.target.value === 'yes' })}
                        disabled={updatingSpeakerId === speaker.id}
                        className="min-w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {speaker.travel?.arrival_date || speaker.travel?.departure_date
                        ? `${speaker.travel?.arrival_date ? formatDate(speaker.travel.arrival_date) : 'TBD'} - ${speaker.travel?.departure_date ? formatDate(speaker.travel.departure_date) : 'TBD'}`
                        : 'Arrival/departure not set'}
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
          totalItems={filteredSpeakers.length}
          variant="light"
        />
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onClick,
}: {
  label: string;
  sortKey: SpeakerSortKey;
  sort: MultiSort<SpeakerSortKey>;
  onClick: (key: SpeakerSortKey) => void;
}) {
  return (
    <th className="px-4 py-3">
      <button type="button" onClick={() => onClick(sortKey)} className="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-black">
        <span>{label}</span>
        <SortIndicator direction={getMultiSortDirection(sort, sortKey)} />
      </button>
    </th>
  );
}

function AttendanceSelect({
  value,
  onChange,
  disabled,
}: {
  value: boolean | null | undefined;
  onChange: (value: boolean | null) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={attendanceValueToSelect(value)}
      onChange={(event) => onChange(selectToAttendanceValue(event.target.value))}
      disabled={disabled}
      className="min-w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
    >
      <option value="unknown">Unknown</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  );
}
