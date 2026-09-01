/**
 * The write path: acknowledge locally, land eventually.
 *
 * A volunteer cannot hold a queue of 300 people while a spinner turns on venue
 * wifi, so a check-in is acknowledged the instant it is taken: the roster in
 * cache is patched, the flash and the beep fire, and the write goes into the
 * session-scoped queue in `@/lib/checkin/mutation-queue`. This hook is what
 * drains it.
 *
 * WHY OPTIMISTIC IS SAFE HERE
 * `door_check_in` is a conditional UPDATE and `duplicate` is a first-class 200
 * outcome, so replaying a write costs at most one duplicate — never a second
 * admission. The one case that needs undoing is a write the server REFUSES
 * (a refunded ticket, a volunteer deactivated mid-shift): the local timestamp is
 * rolled back so the station will let the volunteer try again rather than
 * insisting the person is already in.
 *
 * WHEN IT DRAINS
 * On mount, when the browser reports it is back online, when the tab is
 * foregrounded, and on a slow interval while anything is pending. All four are
 * needed on a phone: a backgrounded tab is frozen, and `online` does not fire
 * when the radio was never technically down but the captive portal was.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  enqueue,
  flushQueue,
  readQueue,
  type DoorMutationPayload,
  type DoorQueuedMutation,
  type FlushResult,
} from '@/lib/checkin/mutation-queue';
import {
  patchRosterBadgePickup,
  patchRosterCheckIn,
  patchRosterGoodie,
  patchRosterUndo,
  revertRosterCheckIn,
  revertRosterGoodie,
} from './useDoorRoster';
import type {
  DoorBadgePickupResult,
  DoorCheckInResult,
  DoorGoodieResult,
  DoorOccasion,
  DoorOutcome,
} from '@/lib/types/checkin';

/** What the server said about one write. `outcome` is always present. */
export type DoorMutationResult = DoorCheckInResult | DoorGoodieResult | DoorBadgePickupResult;

/**
 * Retry cadence while writes are stuck. Slow on purpose: the flush stops at the
 * first offline failure, so this is one request per tick, and a door that has
 * lost connectivity should not spend the volunteer's battery discovering that
 * fact every second.
 */
export const DOOR_QUEUE_RETRY_MS = 15_000;

export interface DoorQueueFailure {
  entry: DoorQueuedMutation;
  message: string;
}

export interface UseDoorMutationQueueOptions {
  /** From `useDoorSession`. Nothing is queued or flushed without it. */
  staffId: string | undefined;
  occasion: DoorOccasion | undefined;
  /** Station label written into the audit trail, e.g. "Door A". */
  station?: string;
  /**
   * Fired for every settled write, so the panel can show the real outcome.
   *
   * Receives the whole result rather than just the outcome: a `duplicate` carries
   * the time the person ACTUALLY arrived, which is earlier than the optimistic
   * timestamp this station wrote, and that earlier time is what the volunteer
   * needs to read out.
   */
  onOutcome?: (entry: DoorQueuedMutation, result: DoorMutationResult) => void;
}

function resultOf(response: unknown): DoorMutationResult | null {
  if (!response || typeof response !== 'object') return null;
  const outcome = (response as Partial<DoorMutationResult>).outcome;
  return outcome ? (response as DoorMutationResult) : null;
}

export function useDoorMutationQueue({
  staffId,
  occasion,
  station,
  onOutcome,
}: UseDoorMutationQueueOptions) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(0);
  const [failures, setFailures] = useState<DoorQueueFailure[]>([]);
  const [isFlushing, setIsFlushing] = useState(false);

  // Read inside listeners and the interval, which must not be torn down and
  // rebuilt every time one of these changes.
  const staffIdRef = useRef(staffId);
  const occasionRef = useRef(occasion);
  const onOutcomeRef = useRef(onOutcome);
  const inFlight = useRef(false);
  staffIdRef.current = staffId;
  occasionRef.current = occasion;
  onOutcomeRef.current = onOutcome;

  /**
   * Roll back the optimistic patch for a write the server refused, and report
   * the real outcome.
   *
   * The payload's OWN occasion wins over the current one: a write queued on
   * workshop day and refused after the volunteer switched days must undo the
   * patch where it was made.
   */
  const revertOptimistic = useCallback(
    (payload: DoorMutationPayload, currentOccasion: DoorOccasion) => {
      const occasionOf = payload.occasion ?? currentOccasion;
      switch (payload.kind) {
        case 'goodie':
          revertRosterGoodie(queryClient, occasionOf, payload.ticketId);
          break;
        case 'badge_pickup':
          patchRosterBadgePickup(queryClient, occasionOf, payload.scannedId, null);
          break;
        case 'undo_check_in':
          // Nothing to roll back: the undo cleared a timestamp this station no
          // longer knows. A refused undo is rare (deactivated volunteer) and
          // the periodic roster refresh restores the server's truth.
          break;
        default:
          revertRosterCheckIn(queryClient, occasionOf, payload.scannedId);
      }
    },
    [queryClient]
  );

  const reconcile = useCallback(
    (result: FlushResult) => {
      const currentOccasion = occasionRef.current;

      result.sent.forEach((entry, position) => {
        const settled = resultOf(result.responses[position]);
        const outcome: DoorOutcome | null = settled?.outcome ?? null;

        if (currentOccasion && (outcome === 'denied' || outcome === 'not_found')) {
          revertOptimistic(entry.payload, currentOccasion);
        }

        // A duplicate badge pickup carries the time the badge ACTUALLY left the
        // desk; the optimistic patch wrote this station's later time, so fold
        // the real one in.
        if (
          currentOccasion &&
          outcome === 'duplicate' &&
          entry.payload.kind === 'badge_pickup' &&
          settled &&
          'alreadyPickedUpAt' in settled &&
          settled.alreadyPickedUpAt
        ) {
          patchRosterBadgePickup(
            queryClient,
            entry.payload.occasion ?? currentOccasion,
            entry.payload.scannedId,
            settled.alreadyPickedUpAt
          );
        }

        if (settled) onOutcomeRef.current?.(entry, settled);
      });

      // A write that will never land is rolled back too: leaving the optimistic
      // timestamp would tell the next volunteer this person is already in.
      if (currentOccasion) {
        for (const failure of result.failed) {
          revertOptimistic(failure.entry.payload, currentOccasion);
        }
      }

      if (result.failed.length > 0) {
        setFailures((previous) => [...previous, ...result.failed]);
      }
      setPending(result.pending);
    },
    [queryClient, revertOptimistic]
  );

  /**
   * Drain the queue and report what happened.
   *
   * Returns the result rather than void because `pending` in state is stale
   * inside the caller's own closure — a caller that needs to know whether the
   * queue is now empty (sign-out does) cannot read it from the render it was
   * created in.
   */
  const flush = useCallback(async (): Promise<FlushResult | null> => {
    const id = staffIdRef.current;
    // One drain at a time. Two concurrent flushes would read the same queue and
    // post every entry twice — survivable, since replay is idempotent, but it
    // doubles the requests exactly when the network is already the problem.
    if (!id || inFlight.current) return null;

    inFlight.current = true;
    setIsFlushing(true);
    try {
      const result = await flushQueue({ staffId: id });
      reconcile(result);
      return result;
    } finally {
      inFlight.current = false;
      setIsFlushing(false);
    }
  }, [reconcile]);

  const flushRef = useRef(flush);
  flushRef.current = flush;

  /**
   * Take a write.
   *
   * Patches the cache first so the panel is correct before this returns — the
   * caller renders the outcome without awaiting anything.
   */
  const submit = useCallback(
    (payload: DoorMutationPayload): DoorQueuedMutation | null => {
      const id = staffIdRef.current;
      const currentOccasion = occasionRef.current;
      if (!id || !currentOccasion) return null;

      // The occasion is stamped at enqueue, like occurredAt: a write queued on
      // one day and flushed on another must still land on the day it was taken.
      const stamped: DoorMutationPayload = {
        ...payload,
        occasion: payload.occasion ?? currentOccasion,
        ...(station ? { station } : {}),
      };
      const entry = enqueue({ staffId: id, payload: stamped });

      switch (entry.payload.kind) {
        case 'goodie':
          patchRosterGoodie(
            queryClient,
            currentOccasion,
            entry.payload.ticketId,
            entry.occurredAt,
            entry.payload.note ?? null
          );
          break;
        case 'undo_check_in':
          patchRosterUndo(queryClient, currentOccasion, entry.payload.scannedId);
          break;
        case 'badge_pickup':
          patchRosterBadgePickup(
            queryClient,
            currentOccasion,
            entry.payload.scannedId,
            entry.occurredAt
          );
          break;
        default:
          patchRosterCheckIn(
            queryClient,
            currentOccasion,
            entry.payload.scannedId,
            entry.occurredAt
          );
      }

      setPending(readQueue(id).length);
      void flushRef.current();
      return entry;
    },
    [queryClient, station]
  );

  const dismissFailure = useCallback((entryId: string) => {
    setFailures((previous) => previous.filter((failure) => failure.entry.id !== entryId));
  }, []);

  // Adopt anything a reload left behind, and drain it.
  useEffect(() => {
    if (!staffId) return;
    setPending(readQueue(staffId).length);
    void flushRef.current();
  }, [staffId]);

  // A phone leaving a dead spot, and a tab coming back from the background.
  // Both are needed: a frozen tab misses `online` entirely.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const drain = () => {
      void flushRef.current();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') drain();
    };

    window.addEventListener('online', drain);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', drain);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Only ticks while something is stuck, so an idle station makes no requests.
  useEffect(() => {
    if (pending === 0) return;

    const timer = window.setInterval(() => {
      void flushRef.current();
    }, DOOR_QUEUE_RETRY_MS);
    return () => window.clearInterval(timer);
  }, [pending]);

  return { pending, failures, isFlushing, submit, flush, dismissFailure };
}
