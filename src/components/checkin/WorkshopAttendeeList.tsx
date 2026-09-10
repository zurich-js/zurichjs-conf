import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, MapPin, Search, X } from 'lucide-react';
import { Button, Input } from '@/components/atoms';
import { formatDoorTime } from '@/lib/checkin/panel-state';
import { foldTerm } from '@/lib/checkin/search';
import type { DoorWorkshopOverview, DoorWorkshopSeatRow } from '@/lib/checkin/roster-index';

export interface WorkshopAttendeeListProps {
  workshop: DoorWorkshopOverview;
  onBack: () => void;
  onClose: () => void;
  /** Roll-call check-in for one seat. Omitted when this role may not admit from a list. */
  onCheckInSeat?: (registrationId: string) => void;
  onUndoSeat?: (registrationId: string) => void;
  showContact?: boolean;
  className?: string;
}

function displayName(row: DoorWorkshopSeatRow, showContact: boolean): string {
  return (
    [row.firstName, row.lastName].filter(Boolean).join(' ') ||
    // An unnamed seat: the buyer never said who was coming, so the company or
    // the address is all there is to call out.
    row.company ||
    (showContact ? row.email : null) ||
    'Unnamed seat'
  );
}

function matches(row: DoorWorkshopSeatRow, needle: string, showContact: boolean): boolean {
  if (!needle) return true;
  const haystack = foldTerm(
    [row.firstName, row.lastName, row.company, showContact ? row.email : null]
      .filter(Boolean)
      .join(' ')
  );
  return haystack.includes(needle);
}

/**
 * Everyone expected in one workshop, the arrivals ticked, the rest still to come.
 *
 * Still-to-arrive people are listed FIRST: at a workshop door the question is
 * "who is missing", and once the room is mostly in, the arrivals are just noise
 * above the two names that matter. The filter is a plain substring on the same
 * folded text the desk search uses, so "muller" finds Müller here too.
 *
 * A check-in from this list is a manual admission — nobody verified a code —
 * which is why the buttons are absent for a role the database would refuse.
 */
export const WorkshopAttendeeList: React.FC<WorkshopAttendeeListProps> = ({
  workshop,
  onBack,
  onClose,
  onCheckInSeat,
  onUndoSeat,
  showContact = false,
  className = '',
}) => {
  const [filter, setFilter] = useState('');
  const needle = foldTerm(filter.trim());

  const { waiting, arrived } = useMemo(() => {
    const visible = workshop.seats.filter((row) => matches(row, needle, showContact));
    return {
      waiting: visible.filter((row) => row.checkedInAt === null),
      arrived: visible.filter((row) => row.checkedInAt !== null),
    };
  }, [workshop.seats, needle, showContact]);

  const renderRow = (row: DoorWorkshopSeatRow) => {
    const arrivedAt = row.checkedInAt;
    const detail = [
      row.company,
      showContact ? row.email : null,
      row.nameSource === 'ticket' ? 'name from ticket' : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <li
        key={row.registrationId}
        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-surface-card px-4 py-3"
      >
        <span className="min-w-0 flex-1 basis-40">
          <span className="block truncate font-medium text-text-primary">
            {displayName(row, showContact)}
          </span>
          {detail ? (
            <span className="block truncate text-sm text-text-tertiary">{detail}</span>
          ) : null}
        </span>

        {arrivedAt ? (
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-success">
            <Check className="h-4 w-4" aria-hidden="true" />
            In at {formatDoorTime(arrivedAt)}
          </span>
        ) : null}

        {!arrivedAt && onCheckInSeat ? (
          <Button
            variant="primary"
            size="sm"
            className="shrink-0 whitespace-nowrap"
            aria-label={`Check in ${displayName(row, showContact)}`}
            onClick={() => onCheckInSeat(row.registrationId)}
          >
            Check in
          </Button>
        ) : null}

        {arrivedAt && onUndoSeat ? (
          <Button
            variant="dark"
            size="sm"
            className="shrink-0 whitespace-nowrap"
            aria-label={`Undo the check-in for ${displayName(row, showContact)}`}
            onClick={() => onUndoSeat(row.registrationId)}
          >
            Undo
          </Button>
        ) : null}
      </li>
    );
  };

  return (
    <section className={`space-y-3 ${className}`} aria-label={`Attendees of ${workshop.title}`}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-card text-text-muted transition-colors hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Back to all workshops</span>
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-snug text-text-primary">
            {workshop.title}
          </h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-tertiary">
            {workshop.startTime ? (
              <time dateTime={workshop.startTime}>
                {workshop.startTime.slice(0, 5)}
                {workshop.endTime ? `–${workshop.endTime.slice(0, 5)}` : ''}
              </time>
            ) : null}
            {workshop.room ? (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {workshop.room}
              </span>
            ) : null}
            <span className="tabular-nums">
              {workshop.checkedIn}/{workshop.total} checked in
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-card text-text-muted transition-colors hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Close workshop lists</span>
        </button>
      </div>

      {!onCheckInSeat ? (
        <p className="rounded-xl bg-surface-card px-4 py-3 text-sm text-text-tertiary">
          Checking someone in from the list needs a door lead — scan their code instead.
        </p>
      ) : null}

      {workshop.seats.length > 8 ? (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter by name or company"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Filter attendees"
            className="pl-10"
            fullWidth
          />
        </div>
      ) : null}

      {workshop.seats.length === 0 ? (
        <p className="rounded-xl bg-surface-card px-4 py-5 text-center text-sm text-text-tertiary">
          No confirmed seats for this workshop.
        </p>
      ) : waiting.length === 0 && arrived.length === 0 ? (
        <p className="rounded-xl bg-surface-card px-4 py-5 text-center text-sm text-text-tertiary">
          Nobody in this room matches that.
        </p>
      ) : (
        <div aria-live="polite" className="space-y-4">
          {waiting.length > 0 ? (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                Still to arrive ({waiting.length})
              </h3>
              <ul className="space-y-2">{waiting.map(renderRow)}</ul>
            </div>
          ) : null}

          {arrived.length > 0 ? (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                Checked in ({arrived.length})
              </h3>
              <ul className="space-y-2">{arrived.map(renderRow)}</ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
};
