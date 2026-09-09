/**
 * The station's tap handlers, one per write the panel can ask for.
 *
 * Every handler follows the same shape: queue the write (the roster patch that
 * makes the panel correct happens inside `submit`), then say what the banner
 * and the beep should do about it. Kept out of the page so the page reads as
 * layout plus the scan-to-verdict flow, and so the "does an undo beep?" and
 * "does a seat check-in move the banner?" decisions live in one place.
 *
 * Nothing here decides WHETHER an action is allowed — the panel hides what the
 * role or the roster forbids, and the database refuses it regardless.
 */

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { GoodieHandoverPayload, GoodieUndoPayload } from '@/components/checkin';
import type { DoorMutationPayload, DoorQueuedMutation } from '@/lib/checkin/mutation-queue';
import type { DoorFeedbackTone } from '@/lib/checkin/feedback';
import type { DoorCheckInResult } from '@/lib/types/checkin';

export interface UseDoorActionsOptions {
  /** The attendee on screen — a ticket id or a seat id. Null between scans. */
  subjectId: string | null;
  submit: (payload: DoorMutationPayload) => DoorQueuedMutation | null;
  setLastResult: Dispatch<SetStateAction<DoorCheckInResult | null>>;
  /** Beep and flash, from one call so they can never disagree. */
  signal: (tone: DoorFeedbackTone) => void;
  /** Forget the last scanned code, so the same badge can be re-read at once. */
  clearGate: () => void;
}

const APPLIED: DoorCheckInResult = { outcome: 'applied' };

export function useDoorActions({
  subjectId,
  submit,
  setLastResult,
  signal,
  clearGate,
}: UseDoorActionsOptions) {
  const checkIn = useCallback(() => {
    if (!subjectId) return;
    submit({ kind: 'check_in', scannedId: subjectId });
    // Optimistic: the roster patch has already recorded the arrival, and this
    // is what turns the banner green before the network is consulted.
    setLastResult(APPLIED);
    signal('success');
  }, [submit, subjectId, setLastResult, signal]);

  /** One workshop seat, on workshop day. The seat id is its own check-in subject. */
  const checkInSeat = useCallback(
    (registrationId: string) => {
      submit({ kind: 'check_in', scannedId: registrationId });
      // No lastResult: the banner derives from the seats, which the optimistic
      // roster patch has already advanced.
      signal('success');
    },
    [submit, signal]
  );

  const undo = useCallback(() => {
    if (!subjectId) return;
    submit({ kind: 'undo_check_in', scannedId: subjectId });
    // The roster patch has already cleared the arrival; the banner recomputes
    // to "Ready to admit" on its own. No beep — nothing was admitted.
    setLastResult(null);
    // Let the same badge be re-scanned immediately for the corrected person.
    clearGate();
  }, [submit, subjectId, setLastResult, clearGate]);

  const undoSeat = useCallback(
    (registrationId: string) => {
      submit({ kind: 'undo_check_in', scannedId: registrationId });
      // The scan may have recorded this seat itself; the banner must not keep
      // saying "Checked in" over a seat row that now says otherwise.
      setLastResult(null);
    },
    [submit, setLastResult]
  );

  const handOverGoodie = useCallback(
    (payload: GoodieHandoverPayload) => {
      // Entitlement follows the conference ticket, so only a ticket subject
      // reaches this — a workshop-only attendee has no ticket to key it on.
      if (!subjectId) return;
      submit({
        kind: 'goodie',
        ticketId: subjectId,
        tshirtSize: payload.tshirtSize ?? undefined,
        hoodieSize: payload.hoodieSize ?? undefined,
        note: payload.note,
      });
      signal('success');
    },
    [submit, subjectId, signal]
  );

  const undoGoodie = useCallback(
    (payload: GoodieUndoPayload) => {
      // Like the handover, keyed on the conference ticket.
      if (!subjectId) return;
      submit({
        kind: 'undo_goodie',
        ticketId: subjectId,
        undoTshirt: payload.undoTshirt,
        undoHoodie: payload.undoHoodie,
      });
    },
    [submit, subjectId]
  );

  const handOverBadge = useCallback(() => {
    if (!subjectId) return;
    submit({ kind: 'badge_pickup', scannedId: subjectId });
    // On the warm-up meetup this IS the verdict, so the banner reads it too.
    setLastResult(APPLIED);
    signal('success');
  }, [submit, subjectId, setLastResult, signal]);

  const undoBadge = useCallback(() => {
    if (!subjectId) return;
    submit({ kind: 'undo_badge_pickup', scannedId: subjectId });
    // No beep — nothing was handed. The badge row recomputes from the patch,
    // and the banner goes back to "hand over their badge".
    setLastResult(null);
  }, [submit, subjectId, setLastResult]);

  const manualAdmit = useCallback(
    (reason: string) => {
      if (!subjectId) return;
      submit({ kind: 'manual_admit', scannedId: subjectId, reason });
      setLastResult(APPLIED);
      signal('success');
    },
    [submit, subjectId, setLastResult, signal]
  );

  return {
    checkIn,
    checkInSeat,
    undo,
    undoSeat,
    handOverGoodie,
    undoGoodie,
    handOverBadge,
    undoBadge,
    manualAdmit,
  };
}
