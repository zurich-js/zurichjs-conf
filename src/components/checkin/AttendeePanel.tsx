import React from 'react';
import { RotateCcw, StickyNote } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import {
  doorFailureMessage,
  roleCan,
  type DoorCheckInResult,
  type DoorOccasion,
  type DoorResolveHit,
  type DoorRole,
} from '@/lib/types/checkin';
import {
  canOfferCheckIn,
  checkedInAtFor,
  resolveDoorPanelDetail,
  resolveDoorPanelState,
  workshopSeatProgress,
} from '@/lib/checkin/panel-state';
import { ApparelSizes } from './ApparelSizes';
import { AttendeeIdentity } from './AttendeeIdentity';
import { BadgeStatus } from './BadgeStatus';
import { DoorRefusalHint, DoorStateBanner } from './DoorStateBanner';
import { GoodieStatus, type GoodieHandoverPayload } from './GoodieStatus';
import { WorkshopSeats } from './WorkshopSeats';

export interface AttendeePanelProps {
  attendee: DoorResolveHit;
  occasion: DoorOccasion;
  role: DoorRole;
  /** Result of the last check-in attempt for this attendee, if any. */
  lastResult?: DoorCheckInResult | null;
  checkInPending?: boolean;
  goodiePending?: boolean;
  onCheckIn?: () => void;
  /** Per-seat check-in: on workshop day each held seat is its own arrival. */
  onCheckInSeat?: (registrationId: string) => void;
  /** Clears a mistaken check-in — the whole person, or one seat. */
  onUndo?: () => void;
  onUndoSeat?: (registrationId: string) => void;
  onHandOverGoodie?: (payload: GoodieHandoverPayload) => void;
  onHandOverBadge?: () => void;
  onEscalate?: () => void;
  className?: string;
}

/**
 * Everything a volunteer needs about one attendee, on one screen, with no
 * second request.
 *
 * Order is deliberate and follows what the volunteer does: the verdict first
 * (they read colour), then the name (they say it out loud), then the entitlements
 * they are about to hand over, then the action. Workshops and notes come last
 * because they are reference, not decision — except on workshop day, where the
 * seats ARE the action: each held workshop is its own check-in, so someone
 * attending two workshops plus the conference is checked in three times.
 */
export const AttendeePanel: React.FC<AttendeePanelProps> = ({
  attendee,
  occasion,
  role,
  lastResult,
  checkInPending = false,
  goodiePending = false,
  onCheckIn,
  onCheckInSeat,
  onUndo,
  onUndoSeat,
  onHandOverGoodie,
  onHandOverBadge,
  onEscalate,
  className = '',
}) => {
  const state = resolveDoorPanelState(attendee, occasion, lastResult);
  const detail = resolveDoorPanelDetail(state, attendee, occasion, lastResult);
  // `onCheckIn` gates the button as well as handling it: reaching an attendee
  // through the lookup desk means nobody verified a QR, so that path omits the
  // handler and offers a manual admission instead — which is a different audit
  // event, not the same one with a different origin.
  const canCheckIn = canOfferCheckIn(attendee, occasion, roleCan(role, 'check_in'));

  // On workshop day, held seats replace the person-level button: the seat is
  // the unit of check-in and the buttons live on the seat rows below.
  const seats = workshopSeatProgress(attendee, occasion);
  const seatDriven = seats.total > 0;

  // Undo is offered where the mistake shows up: a person-level "already in"
  // banner. Seat-level undo lives on the seat rows.
  const canUndo =
    roleCan(role, 'check_in') &&
    !seatDriven &&
    state === 'already' &&
    checkedInAtFor(attendee, occasion) !== null;

  return (
    <section className={`space-y-4 ${className}`} aria-label="Attendee">
      <DoorStateBanner state={state} detail={detail} />

      {!attendee.admissible && attendee.refusalReason ? (
        <DoorRefusalHint message={doorFailureMessage(attendee.refusalReason)} />
      ) : null}

      {lastResult?.outcome === 'denied' && lastResult.failureReason ? (
        <DoorRefusalHint message={doorFailureMessage(lastResult.failureReason)} />
      ) : null}

      <div className="rounded-2xl bg-surface-card p-5">
        <AttendeeIdentity
          firstName={attendee.person.firstName}
          lastName={attendee.person.lastName}
          email={attendee.person.email}
          company={attendee.person.company}
          ticketCategory={attendee.ticket?.category ?? null}
          ticketType={attendee.ticket?.type ?? null}
          transferredFromName={attendee.ticket?.transferredFromName ?? null}
          showContact={roleCan(role, 'view_contact')}
        />
      </div>

      {/* The physical badge: its own fact, because it can be collected early —
          the day before — without consuming any day's check-in. */}
      <BadgeStatus
        pickedUpAt={attendee.badge.pickedUpAt}
        canHandOver={roleCan(role, 'badge_pickup') && attendee.admissible}
        onHandOver={onHandOverBadge}
      />

      {/* Only meaningful for someone entitled to swag. */}
      {attendee.goodie.entitled ? (
        <div className="rounded-2xl bg-surface-card p-5">
          <ApparelSizes
            tshirtSize={attendee.apparel.tshirtSize}
            hoodieSize={attendee.apparel.hoodieSize}
            isVip={attendee.ticket?.isVip ?? false}
          />
        </div>
      ) : null}

      <GoodieStatus
        entitled={attendee.goodie.entitled}
        handedAt={attendee.goodie.handedAt}
        note={attendee.goodie.note}
        preferredTshirtSize={attendee.apparel.tshirtSize}
        preferredHoodieSize={attendee.apparel.hoodieSize}
        isVip={attendee.ticket?.isVip ?? false}
        canHandOver={roleCan(role, 'goodie') && attendee.admissible}
        pending={goodiePending}
        onHandOver={onHandOverGoodie}
      />

      {attendee.workshops.held.length > 0 ||
      attendee.workshops.purchasedForOthers.length > 0 ? (
        <div className="rounded-2xl bg-surface-card p-5">
          <WorkshopSeats
            held={attendee.workshops.held}
            purchasedForOthers={attendee.workshops.purchasedForOthers}
            // Seat buttons only on workshop day, and only when this panel is
            // allowed to check in at all (the lookup path routes through
            // manual admission instead — see onCheckIn above).
            onCheckInSeat={
              occasion === 'workshop_day' && canCheckIn && onCheckIn && onCheckInSeat
                ? onCheckInSeat
                : undefined
            }
            onUndoSeat={
              occasion === 'workshop_day' && roleCan(role, 'check_in') && onUndoSeat
                ? onUndoSeat
                : undefined
            }
          />
        </div>
      ) : null}

      {attendee.doorNote ? (
        <div className="flex items-start gap-3 rounded-xl border border-info/40 bg-info/10 px-4 py-3">
          <StickyNote className="mt-0.5 h-5 w-5 shrink-0 text-info" aria-hidden="true" />
          <p className="text-sm text-text-secondary">{attendee.doorNote}</p>
        </div>
      ) : null}

      {canUndo && onUndo ? (
        <button
          type="button"
          onClick={onUndo}
          className="flex min-h-11 items-center gap-2 text-sm font-medium text-text-muted underline-offset-2 hover:text-text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Wrong person? Undo this check-in
        </button>
      ) : null}

      {/* Sticky so the primary action stays reachable with one thumb however
          long the panel gets. */}
      <div className="sticky bottom-0 -mx-1 flex gap-3 bg-surface-page/95 px-1 py-3 backdrop-blur">
        {canCheckIn && onCheckIn && !seatDriven ? (
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            loading={checkInPending}
            onClick={onCheckIn}
          >
            Check in
          </Button>
        ) : null}
        {onEscalate ? (
          <Button
            variant="dark"
            size="lg"
            className={canCheckIn && onCheckIn && !seatDriven ? '' : 'flex-1'}
            onClick={onEscalate}
          >
            Call a door lead
          </Button>
        ) : null}
      </div>
    </section>
  );
};
