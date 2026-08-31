import React from 'react';
import { StickyNote } from 'lucide-react';
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
  resolveDoorPanelDetail,
  resolveDoorPanelState,
} from '@/lib/checkin/panel-state';
import { ApparelSizes } from './ApparelSizes';
import { AttendeeIdentity } from './AttendeeIdentity';
import { DoorRefusalHint, DoorStateBanner } from './DoorStateBanner';
import { GoodieStatus } from './GoodieStatus';
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
  onHandOverGoodie?: () => void;
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
 * because they are reference, not decision.
 */
export const AttendeePanel: React.FC<AttendeePanelProps> = ({
  attendee,
  occasion,
  role,
  lastResult,
  checkInPending = false,
  goodiePending = false,
  onCheckIn,
  onHandOverGoodie,
  onEscalate,
  className = '',
}) => {
  const state = resolveDoorPanelState(attendee, occasion, lastResult);
  const detail = resolveDoorPanelDetail(state, attendee, occasion, lastResult);
  const canCheckIn = canOfferCheckIn(attendee, occasion, roleCan(role, 'check_in'));

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
          />
        </div>
      ) : null}

      {attendee.doorNote ? (
        <div className="flex items-start gap-3 rounded-xl border border-info/40 bg-info/10 px-4 py-3">
          <StickyNote className="mt-0.5 h-5 w-5 shrink-0 text-info" aria-hidden="true" />
          <p className="text-sm text-text-secondary">{attendee.doorNote}</p>
        </div>
      ) : null}

      {/* Sticky so the primary action stays reachable with one thumb however
          long the panel gets. */}
      <div className="sticky bottom-0 -mx-1 flex gap-3 bg-surface-page/95 px-1 py-3 backdrop-blur">
        {canCheckIn ? (
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
            className={canCheckIn ? '' : 'flex-1'}
            onClick={onEscalate}
          >
            Get a lead
          </Button>
        ) : null}
      </div>
    </section>
  );
};
