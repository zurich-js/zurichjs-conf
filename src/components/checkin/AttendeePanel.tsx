import React from 'react';
import { IdCard, LifeBuoy, RotateCcw, StickyNote } from 'lucide-react';
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
import { AttendeeIdentity } from './AttendeeIdentity';
import { BadgeStatus } from './BadgeStatus';
import { DoorRefusalHint, DoorStateBanner } from './DoorStateBanner';
import { GoodieStatus, type GoodieHandoverPayload, type GoodieUndoPayload } from './GoodieStatus';
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
  /** Takes a mistaken goodie handover back, per item. */
  onUndoGoodie?: (payload: GoodieUndoPayload) => void;
  onHandOverBadge?: () => void;
  /** Takes a mistaken badge handover back. */
  onUndoBadge?: () => void;
  onEscalate?: () => void;
  className?: string;
}

/**
 * Everything a volunteer needs about one attendee, on one screen, ordered so
 * the eye lands on the day's PRIMARY action first:
 *
 *  - warm-up meetup: the badge IS the transaction — badge row right under the
 *    name, and the sticky bar carries the handover. No check-in exists, and
 *    the goodie table is not set up, so neither is rendered at all.
 *  - workshop day: the SEATS are the action — each held workshop checks in at
 *    its own door — so they come right after the name. The badge is a
 *    secondary courtesy for conference ticket holders, below.
 *  - conference day: check in (sticky bar), then badge and goodies.
 *
 * Badges belong to conference tickets, so the badge row only renders for a
 * subject that has one. The sticky bar holds ONE primary action plus a quiet
 * "Help" — two equal pills competing at the thumb was the old layout's worst
 * source of mis-taps.
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
  onUndoGoodie,
  onHandOverBadge,
  onUndoBadge,
  onEscalate,
  className = '',
}) => {
  const state = resolveDoorPanelState(attendee, occasion, lastResult);
  const detail = resolveDoorPanelDetail(state, attendee, occasion, lastResult);
  const communityDay = occasion === 'community_day';
  const workshopDay = occasion === 'workshop_day';
  const isTicketHolder = attendee.ticket !== null;

  // `onCheckIn` gates the button as well as handling it: reaching an attendee
  // through the lookup desk means nobody verified a QR, so that path omits the
  // handler and offers a manual admission instead — which is a different audit
  // event, not the same one with a different origin.
  const canCheckIn = canOfferCheckIn(attendee, occasion, roleCan(role, 'check_in'));

  // On workshop day, held seats replace the person-level button: the seat is
  // the unit of check-in and the buttons live on the seat rows below.
  const seats = workshopSeatProgress(attendee, occasion);
  const seatDriven = seats.total > 0;

  const canHandleBadge =
    roleCan(role, 'badge_pickup') && attendee.admissible && isTicketHolder;
  // On the warm-up meetup the handover moves into the sticky bar, where the
  // thumb already is; the badge row then only reports state.
  const badgeActionInBar = communityDay && canHandleBadge && !attendee.badge.pickedUpAt;

  // Badges belong to conference tickets on every day: a workshop-only
  // attendee is never handed one, so the row would only be noise. When the
  // sticky bar carries the handover, the banner + bar already say everything a
  // not-yet-picked-up row would.
  const showBadge = isTicketHolder && !badgeActionInBar;
  const showGoodies = !communityDay && attendee.goodie.entitled;

  // Undo is offered immediately after admission and on re-scan. The "wrong
  // person of a pair" mistake is realised within a second of the tap, so both
  // 'admitted' (just now) and 'already' (from the roster) show the undo link.
  // Seat-level undo lives on the seat rows.
  const canUndo =
    roleCan(role, 'check_in') &&
    !communityDay &&
    !seatDriven &&
    ((state === 'already' && checkedInAtFor(attendee, occasion) !== null) ||
      state === 'admitted');

  const primaryAction = (() => {
    if (badgeActionInBar && onHandOverBadge) {
      return { label: 'Badge handed over', onClick: onHandOverBadge, loading: false };
    }
    if (canCheckIn && onCheckIn && !seatDriven && !communityDay) {
      return { label: 'Check in', onClick: onCheckIn, loading: checkInPending };
    }
    return null;
  })();

  const workshopSection =
    attendee.workshops.held.length > 0 || attendee.workshops.purchasedForOthers.length > 0 ? (
      <div className="rounded-2xl bg-surface-card p-5">
        <WorkshopSeats
          held={attendee.workshops.held}
          purchasedForOthers={attendee.workshops.purchasedForOthers}
          // Seat buttons only on workshop day, and only when this panel is
          // allowed to check in at all (the lookup path routes through
          // manual admission instead — see onCheckIn above).
          onCheckInSeat={
            workshopDay && canCheckIn && onCheckIn && onCheckInSeat ? onCheckInSeat : undefined
          }
          onUndoSeat={
            workshopDay && roleCan(role, 'check_in') && onUndoSeat ? onUndoSeat : undefined
          }
        />
      </div>
    ) : null;

  const badgeSection = showBadge ? (
    <BadgeStatus
      key={`badge-${attendee.subjectId}`}
      pickedUpAt={attendee.badge.pickedUpAt}
      canHandOver={canHandleBadge}
      actionElsewhere={badgeActionInBar}
      onHandOver={onHandOverBadge}
      onUndo={onUndoBadge}
    />
  ) : null;

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

        {/* Primary actions integrated into the identity card */}
        {(primaryAction || onEscalate) && !seatDriven ? (
          <div className="mt-4 flex items-stretch gap-3 border-t border-divider pt-4">
            {primaryAction ? (
              <Button
                variant="primary"
                size="lg"
                className="flex-1 whitespace-nowrap"
                loading={primaryAction.loading}
                onClick={primaryAction.onClick}
              >
                {primaryAction.label}
              </Button>
            ) : null}
            {onEscalate ? (
              <Button
                variant="dark"
                size={primaryAction ? 'md' : 'lg'}
                className={primaryAction ? 'shrink-0 px-4!' : 'flex-1'}
                aria-label="Get help from a door lead"
                onClick={onEscalate}
              >
                <LifeBuoy className="h-4 w-4" aria-hidden="true" />
                Help
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* On workshop day the seats are the primary action, shown prominently.
          On other days, workshop info is hidden to reduce visual clutter. */}
      {workshopDay ? workshopSection : null}

      {/* Follow-up tasks section header for badge and goodies */}
      {(showBadge || showGoodies) && !communityDay ? (
        <p className="mt-2 text-xs font-medium uppercase tracking-wider text-text-muted">
          Follow-up tasks
        </p>
      ) : null}

      {badgeSection}

      {communityDay && !isTicketHolder ? (
        <div className="flex items-center gap-3 rounded-xl bg-surface-elevated px-4 py-3">
          <IdCard className="h-5 w-5 shrink-0 text-text-tertiary" aria-hidden="true" />
          <p className="text-sm text-text-tertiary">
            No conference badge — workshop only. Nothing to hand over today.
          </p>
        </div>
      ) : null}

      {showGoodies ? (
        <GoodieStatus
          key={attendee.subjectId}
          entitled={attendee.goodie.entitled}
          handedAt={attendee.goodie.handedAt}
          note={attendee.goodie.note}
          tshirtHandedAt={attendee.goodie.tshirtHandedAt}
          hoodieHandedAt={attendee.goodie.hoodieHandedAt}
          preferredTshirtSize={attendee.apparel.tshirtSize}
          preferredHoodieSize={attendee.apparel.hoodieSize}
          isVip={attendee.ticket?.isVip ?? false}
          canHandOver={roleCan(role, 'goodie') && attendee.admissible}
          pending={goodiePending}
          onHandOver={onHandOverGoodie}
          onUndo={onUndoGoodie}
        />
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

      {/* Sticky help bar only shown when seat-driven (workshop day) since
          primary actions are now in the identity card for non-seat flows. */}
      {seatDriven && onEscalate ? (
        <div className="sticky bottom-0 -mx-1 flex items-center justify-center bg-surface-page/95 px-1 py-3 backdrop-blur">
          <Button
            variant="dark"
            size="md"
            className="whitespace-nowrap"
            aria-label="Get help from a door lead"
            onClick={onEscalate}
          >
            <LifeBuoy className="h-4 w-4" aria-hidden="true" />
            Help
          </Button>
        </div>
      ) : null}
    </section>
  );
};
