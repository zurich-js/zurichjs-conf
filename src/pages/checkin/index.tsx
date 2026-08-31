/**
 * The door station.
 *
 * THE WHOLE POINT, IN ONE SENTENCE: a scan costs no network request, and a
 * check-in costs no wait.
 *
 * The roster is prefetched once per shift and indexed in memory, so resolving a
 * badge is a Map lookup. The write is queued and acknowledged locally, so the
 * volunteer sees the verdict and moves on while it lands in the background.
 * Nothing on this screen navigates — a route change would tear down the video
 * track and cost another permission handshake.
 *
 * Measured against the flow it replaces: camera app, notification banner, tap,
 * page load, tap check-in — four interactions and two cold loads per attendee.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { AlertCircle, Radio } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Button, Heading } from '@/components/atoms';
import {
  AttendeePanel,
  DoorNotFound,
  ScanFlash,
  ScannerViewport,
  StationBar,
  StationStartGate,
} from '@/components/checkin';
import { useDoorSession } from '@/hooks/checkin/useDoorSession';
import { useDoorRosterIndex } from '@/hooks/checkin/useDoorRoster';
import { useDoorMutationQueue } from '@/hooks/checkin/useDoorMutationQueue';
import { useDoorScanner } from '@/hooks/checkin/useDoorScanner';
import { extractScannedId } from '@/lib/checkin/roster-index';
import { readQueue } from '@/lib/checkin/mutation-queue';
import { signalDoorOutcome, type DoorFeedbackTone } from '@/lib/checkin/feedback';
import { checkedInAtFor, toneForOutcome } from '@/lib/checkin/panel-state';
import { supabase } from '@/lib/supabase/client';
import { isDoorResolveHit, roleCan, type DoorCheckInResult } from '@/lib/types/checkin';

const STATION_KEY = 'zjs.door.station';

interface ScanState {
  /** Null when the code carried no id we recognise. */
  subjectId: string | null;
  /** Bumped per scan so a repeat of the same badge still registers. */
  nonce: number;
}

/**
 * ONE signal drives both feedback channels.
 *
 * Sound and colour must never disagree. iOS has no vibration API, so a volunteer
 * looking at the attendee rather than the phone has exactly these two cues; a
 * beep that says "already checked in" over a screen that flashes nothing is
 * worse than no feedback, because it is ambiguous.
 *
 * The nonce is separate from the scan's, because a check-in produces feedback
 * without a new scan.
 */
interface Feedback {
  tone: DoorFeedbackTone;
  nonce: number;
}

export default function DoorStationPage() {
  const router = useRouter();
  const session = useDoorSession();
  const staff = session.data?.staff ?? null;
  const occasion = session.data?.occasion;

  const [station, setStation] = useState('');
  const [shiftStarted, setShiftStarted] = useState(false);
  const [scan, setScan] = useState<ScanState | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [lastResult, setLastResult] = useState<DoorCheckInResult | null>(null);
  const [escalating, setEscalating] = useState(false);
  const [carriedOver, setCarriedOver] = useState(0);
  const [signOutBlocked, setSignOutBlocked] = useState(false);

  /** Play a tone and flash the same verdict. Never call one without the other. */
  const signal = useCallback((tone: DoorFeedbackTone) => {
    signalDoorOutcome(tone);
    setFeedback((previous) => ({ tone, nonce: (previous?.nonce ?? 0) + 1 }));
  }, []);

  /**
   * Starts as soon as the session resolves — which is while the volunteer is
   * still reading the start screen and typing their door label. By the time they
   * tap "Start scanning" the roster is usually already in memory, so the first
   * attendee of the shift is as fast as the hundredth.
   */
  const roster = useDoorRosterIndex({ occasion });

  // Declared before the queue because its callback closes over them. Refs rather
  // than state so the callback does not re-subscribe on every scan.
  const scanRef = useRef<ScanState | null>(null);
  const signalRef = useRef(signal);
  scanRef.current = scan;
  signalRef.current = signal;

  const queue = useDoorMutationQueue({
    staffId: staff?.id,
    occasion,
    station: station.trim() || undefined,
    // The server's real answer, arriving after the optimistic one. Only acted on
    // when it concerns the attendee still on screen.
    onOutcome: (entry, result) => {
      const subject =
        entry.payload.kind === 'goodie' ? entry.payload.ticketId : entry.payload.scannedId;
      if (subject !== scanRef.current?.subjectId) return;
      // The optimistic path already said this, so re-announcing it would beep
      // twice for one admission.
      if (result.outcome === 'applied') return;

      setLastResult(result as DoorCheckInResult);
      signalRef.current(toneForOutcome(result.outcome));
    },
  });

  const handleScan = useCallback((raw: string) => {
    const subjectId = extractScannedId(raw);
    setScan((previous) => ({ subjectId, nonce: (previous?.nonce ?? 0) + 1 }));
    setLastResult(null);
    setEscalating(false);
  }, []);

  const scanner = useDoorScanner({ onScan: handleScan });

  // Read after mount, never in render: web storage during render is a hydration
  // mismatch waiting to happen.
  useEffect(() => {
    try {
      setStation(window.localStorage.getItem(STATION_KEY) ?? '');
    } catch {
      // Private mode. The label is a convenience; the shift still works.
    }
  }, []);

  /**
   * Writes this volunteer left behind — a tab the OS recycled mid-shift, or a
   * reload.
   *
   * Deliberately only THEIRS. A queue belonging to a different staff id on this
   * device cannot be sent from here: a flush refuses cross-identity entries,
   * because attributing one volunteer's admission to another corrupts the one
   * record that cannot be reconstructed. Counting those here would promise
   * something the flush will not do.
   */
  useEffect(() => {
    if (!staff?.id) return;
    setCarriedOver(readQueue(staff.id).length);
  }, [staff?.id]);

  useEffect(() => {
    // A 401 is the expected state before sign-in, not an error worth showing.
    if (session.isError) void router.replace('/checkin/login');
  }, [session.isError, router]);

  const attendee = useMemo(() => {
    if (!roster.index || !scan?.subjectId) return null;
    const result = roster.index.resolve(scan.subjectId);
    return isDoorResolveHit(result) ? result : null;
  }, [roster.index, scan?.subjectId]);

  /**
   * Announce the verdict once per scan.
   *
   * Deliberately here and not in the scan handler: the verdict depends on the
   * roster, and the handler runs inside the frame loop where the resolved
   * attendee is not yet known. Guarded on the nonce so the optimistic cache
   * patch — which changes `attendee` and re-runs this — does not beep again.
   */
  const announcedNonce = useRef(0);
  useEffect(() => {
    if (!scan || !occasion || !roster.index) return;
    if (scan.nonce === announcedNonce.current) return;
    announcedNonce.current = scan.nonce;

    if (!attendee || !attendee.admissible) {
      signal('refused');
      return;
    }
    signal(checkedInAtFor(attendee, occasion) ? 'duplicate' : 'success');
  }, [scan, attendee, roster.index, occasion, signal]);

  /**
   * ORDERING MATTERS HERE — do not make this synchronous.
   *
   * `scanner.start()` calls `armDoorAudio()` and `getUserMedia()` synchronously,
   * so both happen inside the click's user activation, which is the only place
   * iOS will unlock an AudioContext or grant a camera. It then awaits, which ends
   * the handler's synchronous portion — React flushes `shiftStarted` at that
   * point, mounting the video element well before the camera stream resolves and
   * the element is read.
   */
  const startShift = useCallback(async () => {
    try {
      window.localStorage.setItem(STATION_KEY, station.trim());
    } catch {
      // Private mode. The label is a convenience, not a requirement.
    }
    setShiftStarted(true);
    await scanner.start();
  }, [scanner, station]);

  const handleCheckIn = useCallback(() => {
    if (!scan?.subjectId) return;
    queue.submit({ kind: 'check_in', scannedId: scan.subjectId });
    // Optimistic: the roster patch has already recorded the arrival, and this is
    // what turns the banner green before the network is consulted.
    setLastResult({ outcome: 'applied' });
    signal('success');
  }, [queue, scan?.subjectId, signal]);

  const handleGoodie = useCallback(() => {
    // Entitlement follows the conference ticket, so only a ticket subject reaches
    // this — a workshop-only attendee has no ticket to key it on.
    if (!attendee || attendee.subjectKind !== 'ticket') return;
    queue.submit({ kind: 'goodie', ticketId: attendee.subjectId });
    signal('success');
  }, [attendee, queue, signal]);

  const dismiss = useCallback(() => {
    setScan(null);
    setFeedback(null);
    setLastResult(null);
    setEscalating(false);
    // The repeat gate is deliberately NOT reset. A badge still lingering in frame
    // would otherwise re-open the panel the instant it is dismissed; leaving the
    // window to expire means a re-scan is a deliberate act.
  }, []);

  const signOut = useCallback(async () => {
    // Signing out drops the queue, and those check-ins would simply never have
    // happened. So try to land them first, and read the RESULT rather than
    // `queue.pending` — that value is stale inside this closure.
    if (queue.pending > 0) {
      const flushed = await queue.flush();
      if (flushed && flushed.pending > 0) {
        setSignOutBlocked(true);
        return;
      }
    }
    scanner.stop();
    await supabase.auth.signOut();
    void router.replace('/checkin/login');
  }, [queue, router, scanner]);

  const body = (() => {
    if (session.isLoading) {
      return (
        <p className="py-16 text-center text-text-muted" aria-live="polite">
          Checking your access…
        </p>
      );
    }

    if (!staff || !occasion) {
      // Reachable only if the session resolved to nothing without erroring.
      // A blank screen at a door is the worst possible answer, so say something.
      return (
        <p className="py-16 text-center text-text-muted">
          Could not read your door access. Reload, and ask a lead if it persists.
        </p>
      );
    }

    if (!shiftStarted) {
      return (
        <StationStartGate
          occasion={occasion}
          role={staff.role}
          staffName={staff.name}
          support={scanner.support}
          station={station}
          onStationChange={setStation}
          onStart={() => void startShift()}
          starting={scanner.status === 'starting'}
          pendingWrites={carriedOver}
        />
      );
    }

    return (
      <div className="space-y-4">
        <StationBar
          occasion={occasion}
          role={staff.role}
          station={station}
          rosterSize={roster.index?.size ?? null}
          generatedAt={roster.generatedAt}
          pendingWrites={queue.pending}
          onRefreshRoster={roster.refetch}
          refreshing={roster.isLoading}
          onSignOut={() => void signOut()}
        />

        {roster.isError ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-error/40 bg-error/10 px-4 py-3"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
            <div className="text-sm text-text-secondary">
              <p>The roster did not load, so scans cannot be resolved.</p>
              <button
                type="button"
                onClick={roster.refetch}
                className="mt-1 font-medium text-brand-primary underline"
              >
                Try again
              </button>
            </div>
          </div>
        ) : null}

        {/* Never unmounted while a shift runs: tearing down the video element
            releases the camera and the next scan pays for a new handshake. */}
        <ScannerViewport
          videoRef={scanner.videoRef}
          status={scanner.status}
          failureMessage={scanner.failureMessage}
          onRetry={() => void scanner.start()}
          torchAvailable={scanner.torchAvailable}
          torchOn={scanner.torchOn}
          onToggleTorch={() => void scanner.toggleTorch()}
          cameras={scanner.cameras}
          onPickCamera={(deviceId) => void scanner.start(deviceId)}
        />

        {signOutBlocked ? (
          <div
            role="alert"
            className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text-secondary"
          >
            <p className="font-medium text-text-primary">Still {queue.pending} unsent</p>
            <p className="mt-1">
              Signing out now would lose them. Stay on this page until the count reaches zero —
              it retries by itself.
            </p>
            <button
              type="button"
              onClick={() => setSignOutBlocked(false)}
              className="mt-2 font-medium text-brand-primary underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {queue.failures.length > 0 ? (
          <div
            role="alert"
            className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-text-secondary"
          >
            <p className="font-medium text-text-primary">
              {queue.failures.length} check-in{queue.failures.length === 1 ? '' : 's'} could not
              be saved
            </p>
            <p className="mt-1">
              Tell a lead. Anyone affected needs admitting again — the record did not stick.
            </p>
            <button
              type="button"
              onClick={() => {
                queue.failures.forEach((failure) => queue.dismissFailure(failure.entry.id));
                // Those people have to be admitted again, so let their badges be
                // re-scanned now instead of waiting out the repeat window.
                scanner.clearGate();
              }}
              className="mt-2 font-medium text-brand-primary underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {scan && attendee ? (
          <AttendeePanel
            attendee={attendee}
            occasion={occasion}
            role={staff.role}
            lastResult={lastResult}
            onCheckIn={handleCheckIn}
            onHandOverGoodie={handleGoodie}
            onEscalate={() => setEscalating(true)}
          />
        ) : null}

        {scan && !attendee && roster.index ? (
          <DoorNotFound
            canLookUp={roleCan(staff.role, 'lookup')}
            // The desk lookup is the next change in the stack; until it lands the
            // honest answer is to fetch someone who can resolve it.
            onEscalate={() => setEscalating(true)}
          />
        ) : null}

        {escalating ? (
          <div className="rounded-2xl border border-info/40 bg-info/10 p-5">
            <div className="flex items-start gap-3">
              <Radio className="mt-0.5 h-5 w-5 shrink-0 text-info" aria-hidden="true" />
              <div className="text-sm text-text-secondary">
                <p className="font-medium text-text-primary">Raise a hand for a door lead</p>
                <p className="mt-1">
                  A lead can admit someone without a working code and see contact details.
                  {scan?.subjectId ? (
                    <>
                      {' '}
                      Read them this reference:{' '}
                      <span className="font-mono text-text-primary">
                        {scan.subjectId.slice(0, 8)}
                      </span>
                      .
                    </>
                  ) : null}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {scan ? (
          <Button variant="dark" size="lg" className="w-full" onClick={dismiss}>
            Next attendee
          </Button>
        ) : (
          <p className="py-6 text-center text-text-muted" aria-live="polite">
            Point the camera at a badge.
          </p>
        )}
      </div>
    );
  })();

  return (
    <>
      <SEO
        title="Door check-in"
        description="ZurichJS Conf door check-in station."
        noindex
      />

      {/* Fixed and full-viewport, so it lives outside the layout. Driven by the
          same signal as the beep, so the two can never disagree. */}
      <ScanFlash nonce={feedback?.nonce ?? 0} tone={feedback?.tone ?? null} />

      <main className="min-h-screen bg-surface-page px-4 py-4">
        <div className="mx-auto w-full max-w-lg">
          {session.isError ? (
            <div className="py-16 text-center">
              <Heading level="h1" className="mb-3 text-xl font-bold">
                Sign in to work the door
              </Heading>
              <Link href="/checkin/login" className="font-medium text-brand-primary underline">
                Go to sign-in
              </Link>
            </div>
          ) : (
            body
          )}
        </div>
      </main>
    </>
  );
}
