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
import { useQueryClient } from '@tanstack/react-query';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/atoms';
import {
  DeskLookup,
  DoorHelpNotice,
  DoorNotFound,
  MyCheckIns,
  ScanFlash,
  ScannerViewport,
  StationAccessState,
  StationAttendee,
  StationBar,
  StationNotices,
  StationQuickActions,
  StationStartGate,
  WorkshopOverview,
} from '@/components/checkin';
import { useDoorSession } from '@/hooks/checkin/useDoorSession';
import { useDoorRosterIndex } from '@/hooks/checkin/useDoorRoster';
import { useDoorMutationQueue } from '@/hooks/checkin/useDoorMutationQueue';
import { useDoorMyActivity } from '@/hooks/checkin/useDoorMyActivity';
import { useDoorScanner } from '@/hooks/checkin/useDoorScanner';
import { useDoorFeedback } from '@/hooks/checkin/useDoorFeedback';
import { useDoorHelp } from '@/hooks/checkin/useDoorHelp';
import { extractScannedId } from '@/lib/checkin/roster-index';
import { DoorApiError } from '@/lib/checkin/api-fetch';
import { disarmDoorAudio } from '@/lib/checkin/feedback';
import { readQueue } from '@/lib/checkin/mutation-queue';
import { checkinKeys } from '@/lib/checkin/query-keys';
import type { DoorSearchableRecord } from '@/lib/checkin/roster-index';
import type { GoodieHandoverPayload, GoodieUndoPayload } from '@/components/checkin';
import { checkedInAtFor, toneForOutcome } from '@/lib/checkin/panel-state';
import { ROLL_CALL_REASON } from '@/lib/checkin/roll-call';
import { supabase } from '@/lib/supabase/client';
import {
  isDoorResolveHit,
  roleCan,
  type DoorCheckInResult,
  type DoorOccasion,
} from '@/lib/types/checkin';

interface ScanState {
  /** Null when the code carried no id we recognise. */
  subjectId: string | null;
  /**
   * What the camera actually read, kept for the help request: when a code
   * matches nobody, the raw payload is the only lead the core team has. Null
   * on the lookup path, where nothing was scanned.
   */
  raw: string | null;
  /** Bumped per scan so a repeat of the same badge still registers. */
  nonce: number;
}

export default function DoorStationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useDoorSession();
  const staff = session.data?.staff ?? null;
  const serverOccasion = session.data?.occasion;

  /**
   * The day being WORKED, which is not always the day it IS: badges are picked
   * up on the community day, and a lead may process the other day's list. The
   * server's clock is the default; the volunteer's explicit choice wins.
   */
  const [occasionOverride, setOccasionOverride] = useState<DoorOccasion | null>(null);
  const occasion = occasionOverride ?? serverOccasion;

  const [shiftStarted, setShiftStarted] = useState(false);
  const [scan, setScan] = useState<ScanState | null>(null);
  const [lastResult, setLastResult] = useState<DoorCheckInResult | null>(null);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [myListOpen, setMyListOpen] = useState(false);
  /** The per-room attendee lists — the alternative to scanning on workshop day. */
  const [workshopsOpen, setWorkshopsOpen] = useState(false);
  /**
   * Whether the attendee on screen was found by name rather than scanned.
   *
   * Load-bearing: nobody verified a QR on that path, so admitting them is a
   * `manual_admit` in the audit trail rather than a `checked_in`. Recording it as
   * the latter would make a review weeks later unable to tell a scanned arrival
   * from a volunteer taking someone's word for it.
   */
  const [fromLookup, setFromLookup] = useState(false);
  const [carriedOver, setCarriedOver] = useState(0);
  const [signOutBlocked, setSignOutBlocked] = useState(false);

  // Sound and colour from one call, so they can never disagree.
  const { feedback, signal, clear: clearFeedback } = useDoorFeedback();

  /**
   * The Help button. It pings the core team on Slack with everything the
   * station knows; the notice under the panel reports whether that actually
   * landed, and tells the volunteer to find someone in person either way.
   */
  const help = useDoorHelp();
  const resetHelp = help.reset;

  /**
   * Starts as soon as the session resolves — which is while the volunteer is
   * still reading the start screen. By the time they tap "Start scanning" the
   * roster is usually already in memory, so the first attendee of the shift is
   * as fast as the hundredth. Re-keyed (and re-fetched) when the day changes.
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
    // The server's real answer, arriving after the optimistic one. Only acted on
    // when it concerns the attendee still on screen.
    onOutcome: (entry, result) => {
      const subject =
        entry.payload.kind === 'goodie' || entry.payload.kind === 'undo_goodie'
          ? entry.payload.ticketId
          : entry.payload.scannedId;
      if (subject !== scanRef.current?.subjectId) return;
      // The optimistic path already said this, so re-announcing it would beep
      // twice for one admission.
      if (result.outcome === 'applied') return;
      // An undo's echo must not repaint the banner as a check-in verdict.
      if (
        entry.payload.kind === 'undo_check_in' ||
        entry.payload.kind === 'undo_goodie' ||
        entry.payload.kind === 'badge_pickup' ||
        entry.payload.kind === 'undo_badge_pickup'
      ) {
        return;
      }

      setLastResult(result as DoorCheckInResult);
      signalRef.current(toneForOutcome(result.outcome));
    },
  });

  const myActivity = useDoorMyActivity({ occasion, enabled: myListOpen && shiftStarted });

  const handleScan = useCallback(
    (raw: string) => {
      const subjectId = extractScannedId(raw);
      setScan((previous) => ({ subjectId, raw, nonce: (previous?.nonce ?? 0) + 1 }));
      setLastResult(null);
      resetHelp();
      setFromLookup(false);
      // A scan takes precedence over a half-typed search: the person in front of
      // the volunteer just presented a badge.
      setLookupOpen(false);
      setWorkshopsOpen(false);
    },
    [resetHelp]
  );

  const scanner = useDoorScanner({ onScan: handleScan });

  /**
   * While an attendee is on screen the camera is collapsed and decoding stops;
   * "Next attendee" brings both back. The stream itself is never released —
   * that would cost another permission handshake per person. Keyed on the
   * stable callbacks, not the scanner object, which is new every render.
   */
  const showingAttendee = scan !== null;
  const { pause: pauseScanner, resume: resumeScanner, status: scannerStatus } = scanner;
  useEffect(() => {
    if (scannerStatus !== 'scanning') return;
    if (showingAttendee) pauseScanner();
    else resumeScanner();
  }, [showingAttendee, scannerStatus, pauseScanner, resumeScanner]);

  // Dev-only seam so visual tests (Playwright) can inject a scan without a
  // camera. Dead code in production builds — NODE_ENV is inlined at build time.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const testWindow = window as Window & { __doorScan?: (raw: string) => void };
    testWindow.__doorScan = handleScan;
    return () => {
      delete testWindow.__doorScan;
    };
  }, [handleScan]);

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

  /**
   * Only a 401 means "go sign in". Anything else — a 403 (signed in but not on
   * the crew) or a 500 (the server fell over) — must NOT bounce the volunteer to
   * the login page: they ARE signed in, and re-authenticating cannot fix it.
   * That redirect is how a server bug reads as "I keep getting kicked out".
   */
  const sessionStatus =
    session.error instanceof DoorApiError ? session.error.status : null;
  const needsSignIn = session.isError && sessionStatus === 401;

  /**
   * Fired AT MOST ONCE. The login page redirects signed-in visitors back here,
   * so two unguarded effects can ping-pong `router.replace` until the browser
   * throws SecurityError ("history.pushState more than 100 times per 10
   * seconds") — which is exactly what used to happen right after sign-out.
   */
  const redirectedToLogin = useRef(false);
  useEffect(() => {
    if (needsSignIn && !redirectedToLogin.current) {
      redirectedToLogin.current = true;
      void router.replace('/checkin/login');
    }
  }, [needsSignIn, router]);

  // Flattened once per roster rather than per keystroke. Rebuilding the search
  // index for 300 people is milliseconds; doing it per character would be felt.
  const searchableRecords = useMemo(
    () => roster.index?.searchable() ?? [],
    [roster.index]
  );

  // Likewise once per roster: the optimistic patch replaces the roster object,
  // so a check-in from the list moves the counts without a rebuild per tap.
  const workshopOverview = useMemo(() => roster.index?.workshops() ?? [], [roster.index]);

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
    setShiftStarted(true);
    await scanner.start();
  }, [scanner]);

  /** Changing the day mid-shift re-keys the roster; the attendee on screen was
   *  resolved against the OLD day's flags, so it is dismissed rather than lied
   *  about. Queued writes keep the day they were taken for. */
  const changeOccasion = useCallback(
    (next: DoorOccasion) => {
      setOccasionOverride(next);
      setScan(null);
      setLastResult(null);
      resetHelp();
    },
    [resetHelp]
  );

  const handleCheckIn = useCallback(() => {
    if (!scan?.subjectId) return;
    queue.submit({ kind: 'check_in', scannedId: scan.subjectId });
    // Optimistic: the roster patch has already recorded the arrival, and this is
    // what turns the banner green before the network is consulted.
    setLastResult({ outcome: 'applied' });
    signal('success');
  }, [queue, scan?.subjectId, signal]);

  /** One workshop seat, on workshop day. The seat id is its own check-in subject. */
  const handleCheckInSeat = useCallback(
    (registrationId: string) => {
      queue.submit({ kind: 'check_in', scannedId: registrationId });
      // No lastResult: the banner derives from the seats, which the optimistic
      // roster patch has already advanced.
      signal('success');
    },
    [queue, signal]
  );

  const handleUndo = useCallback(() => {
    if (!scan?.subjectId) return;
    queue.submit({ kind: 'undo_check_in', scannedId: scan.subjectId });
    // The roster patch has already cleared the arrival; the banner recomputes
    // to "Ready to admit" on its own. No beep — nothing was admitted.
    setLastResult(null);
    // Let the same badge be re-scanned immediately for the corrected person.
    scanner.clearGate();
  }, [queue, scan?.subjectId, scanner]);

  const handleUndoSeat = useCallback(
    (registrationId: string) => {
      queue.submit({ kind: 'undo_check_in', scannedId: registrationId });
    },
    [queue]
  );

  const handleGoodie = useCallback(
    (payload: GoodieHandoverPayload) => {
      // Entitlement follows the conference ticket, so only a ticket subject
      // reaches this — a workshop-only attendee has no ticket to key it on.
      const current = scanRef.current;
      if (!current?.subjectId) return;
      queue.submit({
        kind: 'goodie',
        ticketId: current.subjectId,
        tshirtSize: payload.tshirtSize ?? undefined,
        hoodieSize: payload.hoodieSize ?? undefined,
        note: payload.note,
      });
      signal('success');
    },
    [queue, signal]
  );

  const handleBadgePickup = useCallback(() => {
    if (!scan?.subjectId) return;
    queue.submit({ kind: 'badge_pickup', scannedId: scan.subjectId });
    signal('success');
  }, [queue, scan?.subjectId, signal]);

  const handleUndoBadge = useCallback(() => {
    if (!scan?.subjectId) return;
    queue.submit({ kind: 'undo_badge_pickup', scannedId: scan.subjectId });
    // No beep — nothing was handed. The badge row recomputes from the patch.
  }, [queue, scan?.subjectId]);

  const handleUndoGoodie = useCallback(
    (payload: GoodieUndoPayload) => {
      // Like the handover, keyed on the conference ticket.
      const current = scanRef.current;
      if (!current?.subjectId) return;
      queue.submit({
        kind: 'undo_goodie',
        ticketId: current.subjectId,
        undoTshirt: payload.undoTshirt,
        undoHoodie: payload.undoHoodie,
      });
    },
    [queue]
  );

  /**
   * Admit someone found by name — or, with the roll-call reason, someone ticked
   * off a workshop's attendee list. On workshop day the admission targets ONE
   * seat — admitting the ticket would stamp the person-level column and leave
   * every seat unchecked, so the next door would turn them away as not in.
   */
  const handleManualAdmit = useCallback(
    (reason: string, registrationId?: string) => {
      const subjectId = registrationId ?? scan?.subjectId;
      if (!subjectId) return;
      queue.submit({ kind: 'manual_admit', scannedId: subjectId, reason });
      // A seat admission leaves the banner to the seats, as a scanned one does.
      if (!registrationId) setLastResult({ outcome: 'applied' });
      signal('success');
    },
    [queue, scan?.subjectId, signal]
  );

  const handleLookupSelect = useCallback(
    (record: DoorSearchableRecord) => {
      setScan((previous) => ({
        subjectId: record.subjectId,
        raw: null,
        nonce: (previous?.nonce ?? 0) + 1,
      }));
      setLastResult(null);
      resetHelp();
      setFromLookup(true);
      setLookupOpen(false);
    },
    [resetHelp]
  );

  /**
   * Ask the core team over. Sends whatever the station has: the subject id for
   * a known attendee (the server re-resolves them), the raw code for an unknown
   * one, and nothing at all when the volunteer just needs a person.
   */
  const requestHelp = useCallback(() => {
    const current = scanRef.current;
    const subjectId = current?.subjectId ?? null;
    help.request({
      scannedId: subjectId,
      // The raw payload is only a lead when the id resolved to nobody; with an
      // id the server looks the person up itself. Capped to what the schema
      // accepts so a chatty QR cannot turn a help request into a 400.
      rawCode: subjectId ? null : (current?.raw?.trim().slice(0, 300) ?? null),
      occasion,
      fromLookup,
    });
  }, [help, occasion, fromLookup]);

  const dismiss = useCallback(() => {
    setScan(null);
    clearFeedback();
    setLastResult(null);
    resetHelp();
    setFromLookup(false);
    // The repeat gate is deliberately NOT reset. A badge still lingering in frame
    // would otherwise re-open the panel the instant it is dismissed; leaving the
    // window to expire means a re-scan is a deliberate act.
  }, [clearFeedback, resetHelp]);

  /**
   * Back to the start screen WITHOUT signing out: the way to switch day (or
   * hand the phone over) that does not cost a re-authentication. The camera is
   * released; queued writes and the session are kept.
   */
  const exitShift = useCallback(() => {
    scanner.stop();
    setShiftStarted(false);
    setScan(null);
    clearFeedback();
    setLastResult(null);
    resetHelp();
    setFromLookup(false);
    setLookupOpen(false);
    setMyListOpen(false);
    setWorkshopsOpen(false);
  }, [clearFeedback, resetHelp, scanner]);

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
    // Hand the OS its audio session back with the camera: a page still holding
    // a live AudioContext is what makes a phone show the station as an audio
    // user after the shift. The mic itself is never requested anywhere.
    disarmDoorAudio();
    await supabase.auth.signOut();
    // Drop the cached door state BEFORE navigating. The login page redirects
    // anyone with session data back here; leaving a signed-out session in the
    // cache is what produced the replace() ping-pong and its SecurityError.
    queryClient.removeQueries({ queryKey: checkinKeys.all });
    void router.replace('/checkin/login');
  }, [queue, queryClient, router, scanner]);

  // Release the audio session if the station is left by navigation rather than
  // sign-out. The scanner hook already releases the camera the same way.
  useEffect(() => disarmDoorAudio, []);

  const body = (() => {
    if (session.isError) {
      return (
        <StationAccessState
          phase={needsSignIn ? 'sign_in' : sessionStatus === 403 ? 'forbidden' : 'error'}
          errorMessage={session.error instanceof Error ? session.error.message : null}
          onRetry={() => void session.refetch()}
        />
      );
    }

    if (session.isLoading) {
      return <StationAccessState phase="loading" />;
    }

    if (!staff || !occasion || !serverOccasion) {
      return <StationAccessState phase="empty" />;
    }

    if (!shiftStarted) {
      return (
        <StationStartGate
          occasion={occasion}
          serverOccasion={serverOccasion}
          onOccasionChange={changeOccasion}
          role={staff.role}
          staffName={staff.name}
          support={scanner.support}
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
          onOccasionChange={changeOccasion}
          role={staff.role}
          rosterSize={roster.index?.size ?? null}
          generatedAt={roster.generatedAt}
          pendingWrites={queue.pending}
          onRefreshRoster={roster.refetch}
          refreshing={roster.isLoading}
          onExit={exitShift}
          onSignOut={() => void signOut()}
        />

        <StationNotices
          rosterFailed={roster.isError}
          onRetryRoster={roster.refetch}
          blockedSignOutCount={signOutBlocked ? queue.pending : null}
          onDismissSignOutBlock={() => setSignOutBlocked(false)}
          failedWriteCount={queue.failures.length}
          onDismissFailures={() => {
            queue.failures.forEach((failure) => queue.dismissFailure(failure.entry.id));
            // Those people have to be admitted again, so let their badges be
            // re-scanned now instead of waiting out the repeat window.
            scanner.clearGate();
          }}
        />

        {/* Never unmounted while a shift runs: tearing down the video element
            releases the camera and the next scan pays for a new handshake. It is
            COLLAPSED while an attendee is on screen so their details are what the
            volunteer sees; "Next attendee" brings the picture back. */}
        <ScannerViewport
          videoRef={scanner.videoRef}
          status={scanner.status}
          collapsed={showingAttendee}
          failureMessage={scanner.failureMessage}
          onRetry={() => void scanner.start()}
          torchAvailable={scanner.torchAvailable}
          torchOn={scanner.torchOn}
          onToggleTorch={() => void scanner.toggleTorch()}
          cameras={scanner.cameras}
          activeCameraId={scanner.activeCameraId}
          onPickCamera={(deviceId) => void scanner.start(deviceId)}
        />

        {/* Hidden while an attendee is on screen so their details come first. */}
        {!showingAttendee ? (
          <StationQuickActions
            showLookup={!lookupOpen && roleCan(staff.role, 'lookup') && roster.index !== null}
            showMyList={!myListOpen}
            // The room lists only mean something on the day the rooms run.
            showWorkshops={
              !workshopsOpen && occasion === 'workshop_day' && roster.index !== null
            }
            onOpenLookup={() => setLookupOpen(true)}
            onOpenMyList={() => setMyListOpen(true)}
            onOpenWorkshops={() => setWorkshopsOpen(true)}
          />
        ) : null}

        {workshopsOpen && !showingAttendee && occasion === 'workshop_day' ? (
          <WorkshopOverview
            workshops={workshopOverview}
            // A list check-in is a manual admission — nobody verified a code —
            // so it is lead-only, as the database enforces. Undo is any
            // check-in role's, like the seat rows.
            onCheckInSeat={
              roleCan(staff.role, 'manual_admit')
                ? (registrationId) => handleManualAdmit(ROLL_CALL_REASON, registrationId)
                : undefined
            }
            onUndoSeat={roleCan(staff.role, 'check_in') ? handleUndoSeat : undefined}
            onClose={() => setWorkshopsOpen(false)}
            showContact={roleCan(staff.role, 'view_contact')}
          />
        ) : null}

        {myListOpen ? (
          <MyCheckIns
            events={myActivity.data?.events}
            isLoading={myActivity.isLoading}
            isError={myActivity.isError}
            pendingWrites={queue.pending}
            onRefresh={() => void myActivity.refetch()}
            onClose={() => setMyListOpen(false)}
          />
        ) : null}

        {lookupOpen && roster.index ? (
          <DeskLookup
            records={searchableRecords}
            onSelect={handleLookupSelect}
            onClose={() => setLookupOpen(false)}
            showContact={roleCan(staff.role, 'view_contact')}
          />
        ) : null}

        {scan && attendee ? (
          <StationAttendee
            attendee={attendee}
            occasion={occasion}
            role={staff.role}
            lastResult={lastResult}
            fromLookup={fromLookup}
            onCheckIn={handleCheckIn}
            onCheckInSeat={handleCheckInSeat}
            onManualAdmit={handleManualAdmit}
            onUndo={handleUndo}
            onUndoSeat={handleUndoSeat}
            onHandOverGoodie={handleGoodie}
            onUndoGoodie={handleUndoGoodie}
            onHandOverBadge={handleBadgePickup}
            onUndoBadge={handleUndoBadge}
            onEscalate={help.status === 'idle' ? requestHelp : undefined}
          />
        ) : null}

        {scan && !attendee && roster.index ? (
          <DoorNotFound
            canLookUp={roleCan(staff.role, 'lookup')}
            onOpenLookup={() => setLookupOpen(true)}
            onEscalate={help.status === 'idle' ? requestHelp : undefined}
          />
        ) : null}

        {help.status !== 'idle' ? (
          <DoorHelpNotice
            // Narrowed by the guard above: idle renders nothing.
            status={help.status as Exclude<typeof help.status, 'idle'>}
            reference={help.reference ?? scan?.subjectId?.slice(0, 8) ?? null}
            onDismiss={resetHelp}
          />
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

      {/* overflow-x-hidden is a backstop, not the fix: every row below is meant
          to wrap. It guarantees a stray long token can never make the whole
          station scroll sideways under a volunteer's thumb. */}
      <main className="min-h-screen overflow-x-hidden bg-surface-page px-4 py-4">
        <div className="mx-auto w-full max-w-lg">{body}</div>
      </main>
    </>
  );
}
