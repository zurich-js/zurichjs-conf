import React from 'react';
import { CheckCircle2, GraduationCap, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { formatDoorTime } from '@/lib/checkin/panel-state';
import type { DoorHeldWorkshop, DoorPurchasedForOther } from '@/lib/types/checkin';

export interface WorkshopSeatsProps {
  held: DoorHeldWorkshop[];
  /** Seats this person paid for but is not attending — a colleague's seat. */
  purchasedForOthers: DoorPurchasedForOther[];
  /**
   * Per-seat check-in, offered on workshop day. Each seat is its own check-in:
   * a morning and an afternoon workshop are two separate arrivals at two doors.
   */
  onCheckInSeat?: (registrationId: string) => void;
  /** Per-seat undo, for a mis-tap on the wrong workshop. */
  onUndoSeat?: (registrationId: string) => void;
  className?: string;
}

/**
 * Workshop seats this attendee holds.
 *
 * The `purchasedForOthers` split is not cosmetic. One ticket id is stamped on
 * every seat of a Stripe session, so a purchaser's ticket absorbs their
 * colleagues' seats. Showing those as "held" would send the buyer to a workshop
 * their colleague is attending — so they are listed separately and explicitly as
 * bought-for-someone-else.
 */
export const WorkshopSeats: React.FC<WorkshopSeatsProps> = ({
  held,
  purchasedForOthers,
  onCheckInSeat,
  onUndoSeat,
  className = '',
}) => {
  if (held.length === 0 && purchasedForOthers.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {held.length > 0 ? (
        <>
          <div className="mb-2 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Workshops ({held.length})
            </h3>
          </div>
          {onCheckInSeat && held.length > 1 ? (
            <p className="mb-2 text-xs text-text-tertiary">
              Each workshop is its own check-in — record the one whose door you are on.
            </p>
          ) : null}
          <ul className="space-y-2">
            {held.map((workshop) => (
              <li
                key={workshop.registrationId}
                className="rounded-xl bg-surface-elevated px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-semibold leading-snug text-text-primary">
                    {workshop.title}
                  </p>
                  {workshop.checkedInAt ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-success">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      In at {formatDoorTime(workshop.checkedInAt)}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
                  {workshop.room ? (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {workshop.room}
                    </span>
                  ) : null}
                  {workshop.startTime ? (
                    <time dateTime={workshop.startTime}>
                      {workshop.startTime.slice(0, 5)}
                      {workshop.endTime ? `–${workshop.endTime.slice(0, 5)}` : ''}
                    </time>
                  ) : null}
                  {/* Surfaced so a mismatch is debuggable at the door rather than
                      silently attributing a colleague's seat to the buyer. */}
                  {workshop.matchedBy === 'own_ticket' ? (
                    <span className="italic">matched by ticket</span>
                  ) : null}
                </div>

                {!workshop.checkedInAt && onCheckInSeat ? (
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => onCheckInSeat(workshop.registrationId)}
                  >
                    Check in — {workshop.title}
                  </Button>
                ) : null}

                {workshop.checkedInAt && onUndoSeat ? (
                  <Button
                    variant="dark"
                    size="sm"
                    className="mt-2"
                    onClick={() => onUndoSeat(workshop.registrationId)}
                  >
                    Undo this check-in
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {purchasedForOthers.length > 0 ? (
        <div className={held.length > 0 ? 'mt-4' : ''}>
          <div className="mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Bought for colleagues ({purchasedForOthers.length})
            </h3>
          </div>
          <ul className="space-y-1.5">
            {purchasedForOthers.map((seat) => (
              <li key={seat.registrationId} className="text-sm text-text-tertiary">
                <span className="text-text-secondary">{seat.title}</span>
                {seat.attendeeEmail ? ` — ${seat.attendeeEmail}` : ' — unnamed seat'}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs italic text-text-tertiary">
            This person is not attending these. Each colleague checks in with their own code.
          </p>
        </div>
      ) : null}
    </div>
  );
};
