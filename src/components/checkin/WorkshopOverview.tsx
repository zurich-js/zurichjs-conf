import React, { useState } from 'react';
import { ChevronRight, GraduationCap, MapPin, X } from 'lucide-react';
import type { DoorWorkshopOverview } from '@/lib/checkin/roster-index';
import { WorkshopAttendeeList } from './WorkshopAttendeeList';

export interface WorkshopOverviewProps {
  workshops: DoorWorkshopOverview[];
  /**
   * Roll-call check-in. Omitted for a role that may not admit from a list —
   * nobody verified a code, so this is a manual admission and the database
   * only takes those from a door lead. The list still shows who has arrived.
   */
  onCheckInSeat?: (registrationId: string) => void;
  onUndoSeat?: (registrationId: string) => void;
  onClose: () => void;
  /** Whether this role may see email addresses. */
  showContact?: boolean;
  className?: string;
}

/**
 * Every workshop room on one screen, then everyone expected in one room.
 *
 * WHY THIS EXISTS NEXT TO THE SCANNER
 * A workshop door is a roll call, not a turnstile: twenty people, one room,
 * and a trainer who wants to know who is still missing. Scanning works when a
 * badge has a code; many workshop attendees have a blank one (bought after the
 * print run, or workshop-only with no conference badge at all), and the lookup
 * desk finds them one at a time. A list of the room answers "who is not here
 * yet" at a glance and lets a lead tick people off as they walk in.
 *
 * Everything here reads the roster already in memory — no request per room,
 * and the optimistic patch a check-in makes is what moves the count.
 */
export const WorkshopOverview: React.FC<WorkshopOverviewProps> = ({
  workshops,
  onCheckInSeat,
  onUndoSeat,
  onClose,
  showContact = false,
  className = '',
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId
    ? (workshops.find((workshop) => workshop.workshopId === selectedId) ?? null)
    : null;

  if (selected) {
    return (
      <WorkshopAttendeeList
        workshop={selected}
        onBack={() => setSelectedId(null)}
        onClose={onClose}
        onCheckInSeat={onCheckInSeat}
        onUndoSeat={onUndoSeat}
        showContact={showContact}
        className={className}
      />
    );
  }

  const totals = workshops.reduce(
    (sum, workshop) => ({
      total: sum.total + workshop.total,
      checkedIn: sum.checkedIn + workshop.checkedIn,
    }),
    { total: 0, checkedIn: 0 }
  );

  return (
    <section className={`space-y-3 ${className}`} aria-label="Workshops">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-text-tertiary" aria-hidden="true" />
          <h2 className="text-base font-semibold text-text-primary">Workshops</h2>
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

      <p className="text-xs text-text-muted">
        <span className="tabular-nums">{totals.checkedIn}</span> of{' '}
        <span className="tabular-nums">{totals.total}</span> seats checked in across{' '}
        {workshops.length} workshop{workshops.length === 1 ? '' : 's'}. Tap a room to see
        who is expected.
      </p>

      {workshops.length === 0 ? (
        <p className="rounded-xl bg-surface-card px-4 py-5 text-center text-sm text-text-tertiary">
          No workshops in the roster.
        </p>
      ) : (
        <ul className="space-y-2">
          {workshops.map((workshop) => {
            const done = workshop.total > 0 && workshop.checkedIn === workshop.total;
            return (
              <li key={workshop.workshopId}>
                <button
                  type="button"
                  onClick={() => setSelectedId(workshop.workshopId)}
                  className="flex w-full items-center gap-3 rounded-xl bg-surface-card px-4 py-3 text-left transition-colors hover:bg-surface-card-hover focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-snug text-text-primary">
                      {workshop.title}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-tertiary">
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
                    </span>
                  </span>

                  {/* The figure a trainer asks for: how many are in, of how many. */}
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                      done ? 'bg-success/20 text-success' : 'bg-surface-elevated text-text-secondary'
                    }`}
                  >
                    {workshop.checkedIn}/{workshop.total}
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-text-muted"
                    aria-hidden="true"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
