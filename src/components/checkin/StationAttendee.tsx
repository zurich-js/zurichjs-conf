import React from 'react';
import { canOfferCheckIn, manualAdmitSeatOptions } from '@/lib/checkin/panel-state';
import {
  roleCan,
  type DoorCheckInResult,
  type DoorOccasion,
  type DoorResolveHit,
  type DoorRole,
} from '@/lib/types/checkin';
import { AttendeePanel, type AttendeePanelProps } from './AttendeePanel';
import { ManualAdmit } from './ManualAdmit';

export interface StationAttendeeProps
  extends Omit<AttendeePanelProps, 'attendee' | 'occasion' | 'role' | 'lastResult'> {
  attendee: DoorResolveHit;
  occasion: DoorOccasion;
  role: DoorRole;
  lastResult: DoorCheckInResult | null;
  /**
   * Whether this person was found by name rather than scanned. Load-bearing:
   * nobody verified a QR on that path, so the panel's scan-based check-in
   * handlers are withheld and a manual admission is offered instead.
   */
  fromLookup: boolean;
  /** Admits the person, or one seat of theirs when `registrationId` is given. */
  onManualAdmit: (reason: string, registrationId?: string) => void;
}

/**
 * One attendee on the station: the panel, plus what the lookup path adds.
 *
 * Reaching someone by name means no code was verified, so the scan handlers
 * are dropped here and — for a lead — the manual-admission form takes their
 * place. On workshop day that form names the SEAT: admitting the ticket would
 * leave every seat unchecked and the person turned away at the next door.
 */
export const StationAttendee: React.FC<StationAttendeeProps> = ({
  attendee,
  occasion,
  role,
  lastResult,
  fromLookup,
  onManualAdmit,
  onCheckIn,
  onCheckInSeat,
  ...panelProps
}) => (
  <>
    <AttendeePanel
      attendee={attendee}
      occasion={occasion}
      role={role}
      lastResult={lastResult}
      // Omitted on the lookup path: nobody verified a QR there, so the
      // admission is a manual one and must be recorded as such.
      onCheckIn={fromLookup ? undefined : onCheckIn}
      onCheckInSeat={fromLookup ? undefined : onCheckInSeat}
      {...panelProps}
    />

    {fromLookup && roleCan(role, 'manual_admit') && canOfferCheckIn(attendee, occasion, true) ? (
      <ManualAdmit onAdmit={onManualAdmit} seats={manualAdmitSeatOptions(attendee, occasion)} />
    ) : null}

    {fromLookup &&
    canOfferCheckIn(attendee, occasion, true) &&
    !roleCan(role, 'manual_admit') ? (
      <p className="rounded-xl bg-surface-card px-4 py-3 text-sm text-text-tertiary">
        Admitting someone without a code needs a door lead.
      </p>
    ) : null}
  </>
);
