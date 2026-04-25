/**
 * Speakers Tab Component
 * Program speaker roster with editable travel-attendance planning fields
 */

import { useMemo, useState } from 'react';
import { createColumnHelper, type SortingState, type Updater } from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { Pagination } from '@/components/atoms';
import { AdminDataTable, AdminMobileCard, AdminTableToolbar } from '@/components/admin/common';
import type { SpeakerWithTravel } from '@/lib/cfp/admin-travel';
import { attendanceValueToSelect, selectToAttendanceValue } from './types';
import { formatDate } from './format';

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

const columnHelper = createColumnHelper<SpeakerWithTravel>();

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
  const [sorting, setSorting] = useState<SortingState>([]);

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

    if (sorting.length > 0) {
      next = [...next].sort((a, b) => {
        for (const rule of sorting) {
          const dir = rule.desc ? -1 : 1;
          let comparison = 0;

          if (rule.id === 'speaker') {
            comparison = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
          } else if (rule.id === 'sessions') {
            comparison = a.program_sessions_count - b.program_sessions_count;
          } else if (rule.id === 'travel') {
            comparison = Number(Boolean(a.travel?.travel_confirmed)) - Number(Boolean(b.travel?.travel_confirmed));
          } else if (rule.id === 'location') {
            comparison = [a.city, a.country].filter(Boolean).join(', ').localeCompare([b.city, b.country].filter(Boolean).join(', '));
          }

          if (comparison !== 0) return comparison * dir;
        }
        return 0;
      });
    }

    return next;
  }, [speakers, searchQuery, travelFilter, sorting]);

  const totalPages = Math.ceil(filteredSpeakers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSpeakers = filteredSpeakers.slice(startIndex, startIndex + pageSize);
  const handleSortingChange = (updater: Updater<SortingState>) => {
    setSorting((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      return next.slice(0, 1);
    });
  };

  const columns = [
    columnHelper.display({
      id: 'speaker',
      header: 'Speaker',
      enableSorting: true,
      size: 220,
      cell: ({ row }) => <span className="font-medium text-black">{row.original.first_name} {row.original.last_name}</span>,
    }),
    columnHelper.display({
      id: 'location',
      header: 'Location',
      enableSorting: true,
      size: 180,
      cell: ({ row }) => <span className="text-sm text-brand-gray-dark">{[row.original.city, row.original.country].filter(Boolean).join(', ') || 'Location not set'}</span>,
    }),
    columnHelper.display({
      id: 'sessions',
      header: 'Sessions',
      enableSorting: true,
      size: 100,
      cell: ({ row }) => <span className="text-sm text-brand-gray-dark">{row.original.program_sessions_count}</span>,
    }),
    columnHelper.display({
      id: 'dinner',
      header: 'Dinner',
      enableSorting: false,
      size: 130,
      cell: ({ row }) => (
        <AttendanceSelect
          value={row.original.travel?.attending_speakers_dinner}
          onChange={(value) => onUpdateSpeakerTravel(row.original.id, { attending_speakers_dinner: value })}
          disabled={updatingSpeakerId === row.original.id}
        />
      ),
    }),
    columnHelper.display({
      id: 'afterparty',
      header: 'After-party',
      enableSorting: false,
      size: 130,
      cell: ({ row }) => (
        <AttendanceSelect
          value={row.original.attending_after_party}
          onChange={(value) => onUpdateSpeakerTravel(row.original.id, { attending_after_party: value })}
          disabled={updatingSpeakerId === row.original.id}
        />
      ),
    }),
    columnHelper.display({
      id: 'postconf',
      header: 'Post-conf',
      enableSorting: false,
      size: 130,
      cell: ({ row }) => (
        <AttendanceSelect
          value={row.original.attending_post_conf}
          onChange={(value) => onUpdateSpeakerTravel(row.original.id, { attending_post_conf: value })}
          disabled={updatingSpeakerId === row.original.id}
        />
      ),
    }),
    columnHelper.display({
      id: 'travel',
      header: 'Travel Confirmed',
      enableSorting: true,
      size: 150,
      cell: ({ row }) => (
        <select
          value={row.original.travel?.travel_confirmed ? 'yes' : 'no'}
          onChange={(event) => onUpdateSpeakerTravel(row.original.id, { travel_confirmed: event.target.value === 'yes' })}
          disabled={updatingSpeakerId === row.original.id}
          className="min-w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
        >
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      ),
    }),
    columnHelper.display({
      id: 'plan',
      header: 'Plan',
      enableSorting: false,
      size: 210,
      cell: ({ row }) => (
        <span className="text-sm text-brand-gray-dark">
          {row.original.travel?.arrival_date || row.original.travel?.departure_date
            ? `${row.original.travel?.arrival_date ? formatDate(row.original.travel.arrival_date) : 'TBD'} - ${row.original.travel?.departure_date ? formatDate(row.original.travel.departure_date) : 'TBD'}`
            : 'Arrival/departure not set'}
        </span>
      ),
    }),
  ];

  return (
    <AdminDataTable
      data={paginatedSpeakers}
      columns={columns}
      sorting={sorting}
      onSortingChange={handleSortingChange}
      isLoading={isLoading}
      emptyState="No managed speakers found"
      toolbar={(
        <AdminTableToolbar
          right={(
            <>
              <div className="relative min-w-[280px] max-w-full flex-1 lg:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray-medium" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    onPageChange(1);
                  }}
                  placeholder="Search speakers or location..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pl-10 text-sm text-black placeholder-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
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
            </>
          )}
        />
      )}
      mobileList={{
        renderCard: (speaker) => (
          <AdminMobileCard key={speaker.id}>
            <div className="mb-3">
              <div className="font-semibold text-black">{speaker.first_name} {speaker.last_name}</div>
              <div className="text-xs text-brand-gray-medium">{[speaker.city, speaker.country].filter(Boolean).join(', ') || 'Location not set'}</div>
            </div>
            <div className="mb-3 text-sm text-brand-gray-dark">{speaker.program_sessions_count} session{speaker.program_sessions_count === 1 ? '' : 's'}</div>
            <div className="space-y-3">
              <AttendanceSelect
                value={speaker.travel?.attending_speakers_dinner}
                onChange={(value) => onUpdateSpeakerTravel(speaker.id, { attending_speakers_dinner: value })}
                disabled={updatingSpeakerId === speaker.id}
              />
              <AttendanceSelect
                value={speaker.attending_after_party}
                onChange={(value) => onUpdateSpeakerTravel(speaker.id, { attending_after_party: value })}
                disabled={updatingSpeakerId === speaker.id}
              />
              <AttendanceSelect
                value={speaker.attending_post_conf}
                onChange={(value) => onUpdateSpeakerTravel(speaker.id, { attending_post_conf: value })}
                disabled={updatingSpeakerId === speaker.id}
              />
              <select
                value={speaker.travel?.travel_confirmed ? 'yes' : 'no'}
                onChange={(event) => onUpdateSpeakerTravel(speaker.id, { travel_confirmed: event.target.value === 'yes' })}
                disabled={updatingSpeakerId === speaker.id}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
              >
                <option value="yes">Travel confirmed</option>
                <option value="no">Travel pending</option>
              </select>
            </div>
          </AdminMobileCard>
        ),
      }}
      pagination={(
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          pageSize={pageSize}
          totalItems={filteredSpeakers.length}
          variant="light"
        />
      )}
    />
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
