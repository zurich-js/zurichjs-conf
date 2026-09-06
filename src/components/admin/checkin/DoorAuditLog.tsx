import React, { useMemo, useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { AdminErrorState } from '@/components/admin/AdminErrorState';
import { useDeleteDoorEvents, useDoorEvents } from '@/hooks/checkin/useDoorEvents';
import { useToast } from '@/contexts/ToastContext';
import { DOOR_OCCASIONS, DOOR_OCCASION_LABELS, DOOR_ROLE_LABELS } from '@/lib/types/checkin';
import type { DoorOccasion, DoorRole } from '@/lib/types/checkin';
import type { DoorEventRecord } from '@/lib/checkin/events';

export interface DoorAuditLogProps {
  className?: string;
}

const EVENT_LABELS: Record<string, string> = {
  checked_in: 'Checked in',
  manual_admit: 'Manual admission',
  check_in_undone: 'Check-in undone',
  goodie_handed: 'Goodies handed',
  goodie_undone: 'Goodie handover undone',
  badge_pickup: 'Badge pickup',
  badge_pickup_undone: 'Badge handover undone',
  denied: 'Refused',
};

const OUTCOME_LABELS: Record<string, string> = {
  applied: 'applied',
  duplicate: 'second scan',
  denied: 'refused',
  not_found: 'unknown code',
};

/**
 * The audit trail, readable.
 *
 * Every row is one action by one volunteer: who, did what, to whom, when, and
 * why it was refused if it was. This is the view that answers "who admitted
 * this person" and "what was that run of refusals at 09:20" — questions the
 * live dashboard's aggregates cannot.
 *
 * Deletion exists for rehearsal and test rows and is deliberately heavy: rows
 * are picked explicitly, the button states the count, and the server requires
 * an admin cookie (a door lead can read this view but not prune it). Real event
 * days should never need it.
 */
export const DoorAuditLog: React.FC<DoorAuditLogProps> = ({ className = '' }) => {
  const [occasion, setOccasion] = useState<DoorOccasion | ''>('');
  const [eventType, setEventType] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const toast = useToast();

  const { data, isLoading, isError, refetch, isFetching } = useDoorEvents({
    occasion,
    eventType,
    staffId: null,
    subjectId: null,
  });
  const deleteEvents = useDeleteDoorEvents();

  const events = useMemo(() => data?.events ?? [], [data]);

  const toggle = (id: string) => {
    setConfirmingDelete(false);
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runDelete = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    try {
      await deleteEvents.mutateAsync([...selected]);
      setSelected(new Set());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete the selected rows'
      );
    } finally {
      setConfirmingDelete(false);
    }
  };

  if (isError) {
    return <AdminErrorState message="Could not load the audit log" onRetry={() => void refetch()} />;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="audit-occasion" className="text-sm font-medium text-black">
            Day
          </label>
          <select
            id="audit-occasion"
            value={occasion}
            onChange={(event) => {
              setOccasion(event.target.value as DoorOccasion | '');
              setSelected(new Set());
            }}
            className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            {/* Driven off DOOR_OCCASIONS so a new day reaches the audit log the
                moment it exists — a hardcoded list is how community_day became
                unfilterable here while the station already offered it. */}
            <option value="">All days</option>
            {DOOR_OCCASIONS.map((value) => (
              <option key={value} value={value}>
                {DOOR_OCCASION_LABELS[value]}
              </option>
            ))}
          </select>

          <label htmlFor="audit-type" className="ml-2 text-sm font-medium text-black">
            Action
          </label>
          <select
            id="audit-type"
            value={eventType}
            onChange={(event) => {
              setEventType(event.target.value);
              setSelected(new Set());
            }}
            className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="">Everything</option>
            {Object.entries(EVENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <button
              type="button"
              onClick={() => void runDelete()}
              disabled={deleteEvents.isPending}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50 ${
                confirmingDelete
                  ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                  : 'border-red-300 text-red-700 hover:bg-red-50'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              {confirmingDelete
                ? `Really delete ${selected.size} row${selected.size === 1 ? '' : 's'}?`
                : `Delete ${selected.size} selected`}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Newest first, up to 200 rows per view. Deleting is for rehearsal and test rows only —
        the trail is otherwise append-only, and undone check-ins keep both entries on purpose.
      </p>

      {isLoading && events.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-600">Loading the audit log…</p>
      ) : events.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          No door actions recorded for this view yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-600">
                <th className="px-3 py-2">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Attendee</th>
                <th className="px-3 py-2">Volunteer</th>
                <th className="px-3 py-2">Day</th>
                <th className="px-3 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(event.id)}
                      onChange={() => toggle(event.id)}
                      aria-label={`Select the ${EVENT_LABELS[event.eventType] ?? event.eventType} row for ${event.attendeeName ?? 'unknown attendee'}`}
                      className="h-4 w-4 cursor-pointer accent-brand-primary"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-gray-700">
                    <time dateTime={event.occurredAt}>{formatStamp(event.occurredAt)}</time>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-black">
                    {EVENT_LABELS[event.eventType] ?? event.eventType}
                  </td>
                  <td className="px-3 py-2 text-gray-800">{event.attendeeName ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-800">
                    <span title={DOOR_ROLE_LABELS[event.staffRole as DoorRole] ?? event.staffRole}>
                      {event.staffEmail}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                    {DOOR_OCCASION_LABELS[event.occasion]}
                  </td>
                  <td className="max-w-xs px-3 py-2 text-xs text-gray-600">
                    {detailFor(event)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/** The one line worth reading per row: refusal reason, note, or handed sizes. */
function detailFor(event: DoorEventRecord): string {
  const parts: string[] = [];
  if (event.outcome !== 'applied') parts.push(OUTCOME_LABELS[event.outcome] ?? event.outcome);
  if (event.failureReason) parts.push(event.failureReason);
  if (event.notes) parts.push(event.notes);

  if (event.eventType === 'goodie_handed' && !event.notes) {
    const tshirt = event.metadata['tshirtSizeHanded'];
    const hoodie = event.metadata['hoodieSizeHanded'];
    if (typeof tshirt === 'string') parts.push(`T-shirt ${tshirt}`);
    if (typeof hoodie === 'string') parts.push(`Hoodie ${hoodie}`);
  }
  return parts.join(' · ') || '—';
}

/** "10 Sep 09:14" in the venue's timezone. */
function formatStamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zurich',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
