import React from 'react';
import { CircleSlash, IdCard, ListChecks, RotateCcw, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { formatDoorTime } from '@/lib/checkin/panel-state';
import type { DoorEventRecord } from '@/lib/checkin/events';

export interface MyCheckInsProps {
  /** Newest first, as served by /api/checkin/my-activity. */
  events: DoorEventRecord[] | undefined;
  isLoading: boolean;
  isError: boolean;
  /** Writes still in the offline queue, which are not in the list yet. */
  pendingWrites?: number;
  onRefresh?: () => void;
  onClose: () => void;
  className?: string;
}

/** How each event type reads in a volunteer's own list. */
const EVENT_LABELS: Record<string, string> = {
  checked_in: 'Checked in',
  manual_admit: 'Admitted without a code',
  check_in_undone: 'Check-in undone',
  goodie_handed: 'Goodies handed',
  goodie_undone: 'Goodie handover undone',
  badge_pickup: 'Badge handed over',
  badge_pickup_undone: 'Badge handover undone',
  denied: 'Refused',
};

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  checked_in: ListChecks,
  manual_admit: ShieldAlert,
  check_in_undone: RotateCcw,
  goodie_handed: ListChecks,
  goodie_undone: RotateCcw,
  badge_pickup: IdCard,
  badge_pickup_undone: RotateCcw,
  denied: CircleSlash,
};

/**
 * Everything THIS volunteer has done this shift, newest first.
 *
 * Exists because mid-queue the two questions a volunteer actually asks are
 * "did I already do that person?" and "how many have I let in?" — and the only
 * previous answer was scrolling their own memory. Duplicate and refused rows
 * are shown too: a run of refusals is how a volunteer notices a bad batch of
 * badges before a lead does.
 */
export const MyCheckIns: React.FC<MyCheckInsProps> = ({
  events,
  isLoading,
  isError,
  pendingWrites = 0,
  onRefresh,
  onClose,
  className = '',
}) => {
  const admitted = (events ?? []).filter(
    (event) =>
      (event.eventType === 'checked_in' || event.eventType === 'manual_admit') &&
      event.outcome === 'applied'
  ).length;

  return (
    <section
      className={`rounded-2xl bg-surface-card p-4 ${className}`}
      aria-label="My check-ins this shift"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">My check-ins</h2>
          <p className="text-xs text-text-muted" aria-live="polite">
            {events ? `${admitted} admitted today` : 'Loading…'}
            {pendingWrites > 0 ? ` · ${pendingWrites} still sending` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh ? (
            <Button variant="dark" size="sm" onClick={onRefresh}>
              Refresh
            </Button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-surface-elevated hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Close my check-ins</span>
          </button>
        </div>
      </div>

      {isError ? (
        <p className="py-4 text-center text-sm text-text-muted">
          Could not load your list. It is only a view — your check-ins are safe.
        </p>
      ) : isLoading && !events ? (
        <p className="py-4 text-center text-sm text-text-muted" aria-live="polite">
          Loading your check-ins…
        </p>
      ) : events && events.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">
          Nothing yet — your first scan of the day will appear here.
        </p>
      ) : (
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {(events ?? []).map((event) => {
            const Icon = EVENT_ICONS[event.eventType] ?? ListChecks;
            const refused = event.outcome === 'denied' || event.outcome === 'not_found';
            const secondScan = event.outcome === 'duplicate';
            return (
              <li
                key={event.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2 odd:bg-surface-elevated/50"
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${refused ? 'text-error' : 'text-text-tertiary'}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-primary">
                    {event.attendeeName ?? 'Unknown attendee'}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {EVENT_LABELS[event.eventType] ?? event.eventType}
                    {secondScan ? ' · second scan' : ''}
                    {refused && event.failureReason ? ` · ${event.failureReason}` : ''}
                  </p>
                </div>
                <time
                  dateTime={event.occurredAt}
                  className="shrink-0 text-xs tabular-nums text-text-muted"
                >
                  {formatDoorTime(event.occurredAt)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
