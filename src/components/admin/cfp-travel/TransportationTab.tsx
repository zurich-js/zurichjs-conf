/**
 * Transportation Tab
 * Admin planning view for inbound/outbound transport with modal editing
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { ExternalLink, Search } from 'lucide-react';
import { Pagination } from '@/components/atoms';
import { AdminDataTable, AdminMobileCard, AdminTableToolbar } from '@/components/admin/common';
import { AdminModal, AdminModalFooter } from '@/components/admin/AdminModal';
import { cycleMultiSort, getMultiSortDirection, SortIndicator, type MultiSort } from '@/components/admin/cfp/tableSort';
import type { SpeakerWithTravel, TransportWithSpeaker } from '@/lib/cfp/admin-travel';
import type { CfpTransportMode, CfpTransportStatus } from '@/lib/types/cfp';
import { TRANSPORT_STATUS_COLORS } from './types';
import { formatDateTime, formatTime, getTimestamp } from './format';

interface TransportationTabProps {
  speakers: SpeakerWithTravel[];
  transportation: TransportWithSpeaker[];
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onSaveTransportation: (speakerId: string, legs: TransportationLegInput[]) => void;
  savingSpeakerId: string | null;
  focusSpeakerId?: string | null;
  onFocusedSpeakerHandled?: () => void;
}

interface TransportationLegInput {
  direction: 'inbound' | 'outbound';
  transport_mode: CfpTransportMode;
  transport_status: CfpTransportStatus;
  provider: string;
  reference_code: string;
  departure_label: string;
  arrival_label: string;
  departure_time: string;
  arrival_time: string;
  transport_link_url: string;
  admin_notes: string;
}

type TransportationRow = {
  speaker: SpeakerWithTravel;
  inbound: TransportWithSpeaker | null;
  outbound: TransportWithSpeaker | null;
  sortKey: string;
};

type TransportationSortKey = 'speaker' | 'inbound' | 'outbound' | 'priority';

const TRANSPORT_MODE_OPTIONS: Array<{ value: CfpTransportMode; label: string }> = [
  { value: 'flight', label: 'Flight' },
  { value: 'train', label: 'Train' },
  { value: 'link_only', label: 'Link only' },
  { value: 'none', label: 'No travel' },
];

const TRANSPORT_STATUS_OPTIONS: Array<{ value: CfpTransportStatus; label: string }> = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'complete', label: 'Complete' },
];

const EMPTY_LEG = (direction: 'inbound' | 'outbound'): TransportationLegInput => ({
  direction,
  transport_mode: 'none',
  transport_status: 'scheduled',
  provider: '',
  reference_code: '',
  departure_label: '',
  arrival_label: '',
  departure_time: '',
  arrival_time: '',
  transport_link_url: '',
  admin_notes: '',
});
const columnHelper = createColumnHelper<TransportationRow>();

export function TransportationTab({
  speakers,
  transportation,
  isLoading,
  currentPage,
  onPageChange,
  pageSize,
  onSaveTransportation,
  savingSpeakerId,
  focusSpeakerId,
  onFocusedSpeakerHandled,
}: TransportationTabProps) {
  const [selectedRow, setSelectedRow] = useState<TransportationRow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CfpTransportStatus>('all');
  const [modeFilter, setModeFilter] = useState<'all' | CfpTransportMode>('all');
  const [sort, setSort] = useState<MultiSort<TransportationSortKey>>([]);

  const transportationBySpeaker = useMemo(() => {
    return transportation.reduce<Record<string, { inbound: TransportWithSpeaker | null; outbound: TransportWithSpeaker | null }>>(
      (acc, item) => {
        if (!acc[item.speaker.id]) acc[item.speaker.id] = { inbound: null, outbound: null };
        acc[item.speaker.id][item.direction] = item;
        return acc;
      },
      {}
    );
  }, [transportation]);

  const rows = useMemo<TransportationRow[]>(() => {
    let next = [...speakers]
      .map((speaker) => {
        const inbound = transportationBySpeaker[speaker.id]?.inbound || null;
        const outbound = transportationBySpeaker[speaker.id]?.outbound || null;
        return {
          speaker,
          inbound,
          outbound,
          sortKey: getTransportationSortKey(inbound, outbound, speaker),
        };
      })
      .filter((row) => {
        const haystack = [
          row.speaker.first_name,
          row.speaker.last_name,
          row.speaker.city,
          row.speaker.country,
          row.inbound?.provider,
          row.inbound?.reference_code,
          row.outbound?.provider,
          row.outbound?.reference_code,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const matchesSearch = haystack.includes(searchQuery.toLowerCase());
        const modes = [row.inbound?.transport_mode, row.outbound?.transport_mode].filter(Boolean);
        const statuses = [row.inbound?.transport_status, row.outbound?.transport_status].filter(Boolean);
        const matchesMode = modeFilter === 'all' || modes.includes(modeFilter);
        const matchesStatus = statusFilter === 'all' || statuses.includes(statusFilter);
        return matchesSearch && matchesMode && matchesStatus;
      });

    if (sort.length > 0) {
      next = next.sort((a, b) => {
        for (const rule of sort) {
          const direction = rule.direction === 'asc' ? 1 : -1;
          let comparison = 0;
          if (rule.key === 'speaker') {
            comparison = `${a.speaker.last_name} ${a.speaker.first_name}`.localeCompare(`${b.speaker.last_name} ${b.speaker.first_name}`);
          } else if (rule.key === 'inbound') {
            comparison = (getTimestamp(a.inbound?.arrival_time || a.inbound?.departure_time) || Number.MAX_SAFE_INTEGER)
              - (getTimestamp(b.inbound?.arrival_time || b.inbound?.departure_time) || Number.MAX_SAFE_INTEGER);
          } else if (rule.key === 'outbound') {
            comparison = (getTimestamp(a.outbound?.departure_time || a.outbound?.arrival_time) || Number.MAX_SAFE_INTEGER)
              - (getTimestamp(b.outbound?.departure_time || b.outbound?.arrival_time) || Number.MAX_SAFE_INTEGER);
          } else if (rule.key === 'priority') {
            comparison = a.sortKey.localeCompare(b.sortKey);
          }
          if (comparison !== 0) return comparison * direction;
        }
        return 0;
      });
    } else {
      next = next.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }

    return next;
  }, [speakers, transportationBySpeaker, searchQuery, modeFilter, statusFilter, sort]);

  useEffect(() => {
    if (!focusSpeakerId) return;
    const match = rows.find((row) => row.speaker.id === focusSpeakerId);
    if (match) {
      setSelectedRow(match);
    }
    onFocusedSpeakerHandled?.();
  }, [focusSpeakerId, onFocusedSpeakerHandled, rows]);

  const totalPages = Math.ceil(rows.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = rows.slice(startIndex, startIndex + pageSize);
  const hasActiveFilters = Boolean(searchQuery || modeFilter !== 'all' || statusFilter !== 'all');

  const handleSortClick = (key: TransportationSortKey) => setSort(cycleMultiSort(sort, key));

  return (
    <>
      <AdminDataTable
        data={paginatedRows}
        columns={getTransportationColumns({ sort, handleSortClick, setSelectedRow })}
        isLoading={isLoading}
        emptyState="No transportation plans found"
        onRowClick={(row) => setSelectedRow(row)}
        toolbar={(
          <AdminTableToolbar
            left={hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setModeFilter('all');
                  setStatusFilter('all');
                  onPageChange(1);
                }}
                className="ml-2 inline-flex text-xs text-brand-gray-dark underline hover:text-black cursor-pointer"
              >
                Reset filters
              </button>
            ) : undefined}
            right={(
              <>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    onPageChange(1);
                  }}
                  placeholder="Search speaker or route..."
                  className="min-w-[280px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-primary lg:flex-none"
                />
                <select
                  value={modeFilter}
                  onChange={(event) => {
                    setModeFilter(event.target.value as typeof modeFilter);
                    onPageChange(1);
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="all">All modes</option>
                  {TRANSPORT_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as typeof statusFilter);
                    onPageChange(1);
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="all">All statuses</option>
                  {TRANSPORT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </>
            )}
          />
        )}
        mobileList={{
          renderCard: (row) => (
            <AdminMobileCard key={row.speaker.id}>
              <div className="mb-3">
                <div className="font-medium text-black">{row.speaker.first_name} {row.speaker.last_name}</div>
                <div className="mt-1 text-xs text-brand-gray-medium">{row.speaker.program_sessions_count} session{row.speaker.program_sessions_count === 1 ? '' : 's'}</div>
              </div>
              <div className="mb-3 text-sm text-brand-gray-dark">
                <div>{[row.speaker.city, row.speaker.country].filter(Boolean).join(', ') || 'Unknown location'}</div>
                <div className="mt-1 text-xs text-brand-gray-medium">Airport: {row.speaker.departure_airport || 'Not set'}</div>
              </div>
              <div className="space-y-3">
                <TransportCell transport={row.inbound} fallbackLabel="No inbound set" />
                <TransportCell transport={row.outbound} fallbackLabel="No outbound set" />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-brand-gray-lightest pt-3">
                <div className="text-sm text-brand-gray-dark">
                  <div className="font-medium text-black">{getPriorityLabel(row)}</div>
                  <div className="mt-1 text-xs text-brand-gray-medium">{row.speaker.travel?.travel_confirmed ? 'Travel confirmed' : 'Needs confirmation'}</div>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-black hover:bg-text-brand-gray-lightest"
                  onClick={() => setSelectedRow(row)}
                >
                  View details
                </button>
              </div>
            </AdminMobileCard>
          ),
          emptyState: <div className="py-10 text-center text-brand-gray-medium">No transportation plans found</div>,
        }}
        pagination={(
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={pageSize}
            totalItems={rows.length}
            variant="light"
          />
        )}
      />

      {selectedRow ? (
        <TransportationModal
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
          onSave={(legs) => onSaveTransportation(selectedRow.speaker.id, legs)}
          isSaving={savingSpeakerId === selectedRow.speaker.id}
        />
      ) : null}
    </>
  );
}

function TransportationModal({
  row,
  onClose,
  onSave,
  isSaving,
}: {
  row: TransportationRow;
  onClose: () => void;
  onSave: (legs: TransportationLegInput[]) => void;
  isSaving: boolean;
}) {
  const [inbound, setInbound] = useState<TransportationLegInput>(toLegInput(row.inbound, 'inbound'));
  const [outbound, setOutbound] = useState<TransportationLegInput>(toLegInput(row.outbound, 'outbound'));

  useEffect(() => {
    setInbound(toLegInput(row.inbound, 'inbound'));
    setOutbound(toLegInput(row.outbound, 'outbound'));
  }, [row]);

  return (
    <AdminModal
      onClose={onClose}
      title={`${row.speaker.first_name} ${row.speaker.last_name}`}
      description="Transportation details"
      size="3xl"
      footer={
        <AdminModalFooter
          onCancel={onClose}
          onConfirm={() => onSave([inbound, outbound])}
          confirmText="Save transportation"
          isLoading={isSaving}
        />
      }
    >
      <div className="space-y-8">
        <TransportEditorSection title="Inbound" leg={inbound} onChange={setInbound} />
        <TransportEditorSection title="Outbound" leg={outbound} onChange={setOutbound} />
      </div>
    </AdminModal>
  );
}

function getTransportationColumns({
  sort,
  handleSortClick,
  setSelectedRow,
}: {
  sort: MultiSort<TransportationSortKey>;
  handleSortClick: (key: TransportationSortKey) => void;
  setSelectedRow: (row: TransportationRow) => void;
}): Array<ColumnDef<TransportationRow, unknown>> {
  return [
    columnHelper.display({
      id: 'speaker',
      header: () => (
        <button type="button" onClick={() => handleSortClick('speaker')} className="inline-flex items-center gap-1 font-medium text-brand-gray-medium hover:text-black">
          <span>Speaker</span>
          <SortIndicator direction={getMultiSortDirection(sort, 'speaker')} />
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-black">{row.original.speaker.first_name} {row.original.speaker.last_name}</div>
          <div className="mt-1 text-xs text-brand-gray-medium">{row.original.speaker.program_sessions_count} session{row.original.speaker.program_sessions_count === 1 ? '' : 's'}</div>
        </div>
      ),
    }),
    columnHelper.display({
      id: 'from',
      header: 'From',
      cell: ({ row }) => (
        <div className="text-sm text-brand-gray-dark">
          <div>{[row.original.speaker.city, row.original.speaker.country].filter(Boolean).join(', ') || 'Unknown location'}</div>
          <div className="mt-1 text-xs text-brand-gray-medium">Airport: {row.original.speaker.departure_airport || 'Not set'}</div>
        </div>
      ),
    }),
    columnHelper.display({
      id: 'inbound',
      header: () => (
        <button type="button" onClick={() => handleSortClick('inbound')} className="inline-flex items-center gap-1 font-medium text-brand-gray-medium hover:text-black">
          <span>Inbound</span>
          <SortIndicator direction={getMultiSortDirection(sort, 'inbound')} />
        </button>
      ),
      cell: ({ row }) => <TransportCell transport={row.original.inbound} fallbackLabel="No inbound set" />,
    }),
    columnHelper.display({
      id: 'outbound',
      header: () => (
        <button type="button" onClick={() => handleSortClick('outbound')} className="inline-flex items-center gap-1 font-medium text-brand-gray-medium hover:text-black">
          <span>Outbound</span>
          <SortIndicator direction={getMultiSortDirection(sort, 'outbound')} />
        </button>
      ),
      cell: ({ row }) => <TransportCell transport={row.original.outbound} fallbackLabel="No outbound set" />,
    }),
    columnHelper.display({
      id: 'priority',
      header: () => (
        <button type="button" onClick={() => handleSortClick('priority')} className="inline-flex items-center gap-1 font-medium text-brand-gray-medium hover:text-black">
          <span>Priority</span>
          <SortIndicator direction={getMultiSortDirection(sort, 'priority')} />
        </button>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-brand-gray-dark">
          <div className="font-medium text-black">{getPriorityLabel(row.original)}</div>
          <div className="mt-1 text-xs text-brand-gray-medium">{row.original.speaker.travel?.travel_confirmed ? 'Travel confirmed' : 'Needs confirmation'}</div>
        </div>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <button
          type="button"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-black hover:bg-text-brand-gray-lightest"
          onClick={(event) => {
            event.stopPropagation();
            setSelectedRow(row.original);
          }}
        >
          View details
        </button>
      ),
    }),
  ];
}

function TransportEditorSection({
  title,
  leg,
  onChange,
}: {
  title: string;
  leg: TransportationLegInput;
  onChange: (leg: TransportationLegInput) => void;
}) {
  const trackingUrl = leg.transport_mode === 'flight' ? leg.transport_link_url || buildFlightAwareUrl(leg.reference_code) : leg.transport_link_url;
  const googleSearchUrl = buildGoogleSearchUrl(leg);

  return (
    <section className="rounded-xl border border-brand-gray-lightest p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-black">{title}</h3>
          <p className="text-sm text-brand-gray-medium">Set the transport type, link, and operational status for this leg.</p>
        </div>
        <div className="flex gap-2">
          {trackingUrl ? (
            <a href={trackingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-black hover:bg-text-brand-gray-lightest">
              <ExternalLink className="size-4" />
              Tracker
            </a>
          ) : null}
          {googleSearchUrl ? (
            <a href={googleSearchUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-black hover:bg-text-brand-gray-lightest">
              <Search className="size-4" />
              Google search
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Mode">
          <select value={leg.transport_mode} onChange={(event) => onChange({ ...leg, transport_mode: event.target.value as CfpTransportMode })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary">
            {TRANSPORT_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={leg.transport_status} onChange={(event) => onChange({ ...leg, transport_status: event.target.value as CfpTransportStatus })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary">
            {TRANSPORT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field label={leg.transport_mode === 'train' ? 'Operator' : 'Provider'}>
          <input value={leg.provider} onChange={(event) => onChange({ ...leg, provider: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder={leg.transport_mode === 'train' ? 'e.g. SBB' : 'e.g. Swiss'} />
        </Field>
        <Field label={leg.transport_mode === 'train' ? 'Reference' : 'Flight / reference code'}>
          <input value={leg.reference_code} onChange={(event) => onChange({ ...leg, reference_code: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder={leg.transport_mode === 'train' ? 'e.g. IC 5' : 'e.g. LX1889'} />
        </Field>
        <Field label="From">
          <input value={leg.departure_label} onChange={(event) => onChange({ ...leg, departure_label: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="Departure airport, station, or city" />
        </Field>
        <Field label="To">
          <input value={leg.arrival_label} onChange={(event) => onChange({ ...leg, arrival_label: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="Arrival airport, station, or city" />
        </Field>
        <Field label="Departure time">
          <input type="datetime-local" value={leg.departure_time} onChange={(event) => onChange({ ...leg, departure_time: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary" />
        </Field>
        <Field label="Arrival time">
          <input type="datetime-local" value={leg.arrival_time} onChange={(event) => onChange({ ...leg, arrival_time: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary" />
        </Field>
        <Field label="Tracking / reference link" className="md:col-span-2">
          <input value={leg.transport_link_url} onChange={(event) => onChange({ ...leg, transport_link_url: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="https://..." />
        </Field>
        <Field label="Notes" className="md:col-span-2">
          <textarea value={leg.admin_notes} onChange={(event) => onChange({ ...leg, admin_notes: event.target.value })} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="Optional notes for ops" />
        </Field>
      </div>
    </section>
  );
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function TransportCell({ transport, fallbackLabel }: { transport: TransportWithSpeaker | null; fallbackLabel: string }) {
  if (!transport) return <span className="text-sm text-brand-gray-medium">{fallbackLabel}</span>;

  return (
    <div className="text-sm text-brand-gray-dark">
      <div className="font-medium text-black">{transport.provider || transport.transport_mode} {transport.reference_code || ''}</div>
      <div className="mt-1">{(transport.departure_label || '?')} {'->'} {(transport.arrival_label || '?')}</div>
      <div className="mt-1 text-xs text-brand-gray-medium">{formatTransportTime(transport)}</div>
      <div className="mt-2">
        <span className={`px-2 py-1 text-xs rounded ${TRANSPORT_STATUS_COLORS[transport.transport_status]}`}>{transport.transport_status}</span>
      </div>
    </div>
  );
}

function toLegInput(transport: TransportWithSpeaker | null, direction: 'inbound' | 'outbound'): TransportationLegInput {
  if (!transport) return EMPTY_LEG(direction);
  return {
    direction,
    transport_mode: transport.transport_mode,
    transport_status: transport.transport_status,
    provider: transport.provider || '',
    reference_code: transport.reference_code || '',
    departure_label: transport.departure_label || '',
    arrival_label: transport.arrival_label || '',
    departure_time: toLocalDateTimeValue(transport.departure_time),
    arrival_time: toLocalDateTimeValue(transport.arrival_time),
    transport_link_url: transport.transport_link_url || '',
    admin_notes: transport.admin_notes || '',
  };
}

function toLocalDateTimeValue(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatTransportTime(transport: TransportWithSpeaker) {
  const timestamp = transport.direction === 'inbound' ? transport.arrival_time || transport.departure_time : transport.departure_time || transport.arrival_time;
  return formatDateTime(timestamp);
}

function getTransportationSortKey(inbound: TransportWithSpeaker | null, outbound: TransportWithSpeaker | null, speaker: SpeakerWithTravel) {
  return (
    inbound?.arrival_time ||
    inbound?.departure_time ||
    outbound?.departure_time ||
    outbound?.arrival_time ||
    speaker.travel?.arrival_date ||
    speaker.travel?.departure_date ||
    '9999-12-31'
  );
}

function getPriorityLabel(row: TransportationRow) {
  if (row.inbound?.transport_status === 'delayed' || row.outbound?.transport_status === 'delayed') {
    return 'Needs attention';
  }
  if (row.inbound?.arrival_time) return `Arrival ${formatTime(row.inbound.arrival_time)}`;
  if (row.outbound?.departure_time) return `Departure ${formatTime(row.outbound.departure_time)}`;
  return 'Plan needed';
}

function buildFlightAwareUrl(referenceCode: string) {
  if (!referenceCode.trim()) return '';
  const normalized = referenceCode.replace(/\s+/g, '').toUpperCase();
  const match = normalized.match(/^([A-Z0-9]{2,3})(\d{1,4}[A-Z]?)$/);
  if (!match) return `https://www.flightaware.com/live/flight/${encodeURIComponent(normalized)}`;

  const prefixMap: Record<string, string> = { LX: 'SWR', LH: 'DLH', BA: 'BAW', AF: 'AFR', KL: 'KLM' };
  const [, prefix, number] = match;
  return `https://www.flightaware.com/live/flight/${prefixMap[prefix] || prefix}${number}`;
}

function buildGoogleSearchUrl(leg: TransportationLegInput) {
  const query = [leg.provider, leg.reference_code, leg.departure_label, leg.arrival_label].filter(Boolean).join(' ');
  return query ? `https://www.google.com/search?q=${encodeURIComponent(query)}` : '';
}
