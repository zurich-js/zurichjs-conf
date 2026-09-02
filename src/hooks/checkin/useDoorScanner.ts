/**
 * Bind the scanner to a React tree.
 *
 * The whole contract is: call `start()` from a real user gesture, attach `videoRef`
 * to a `<video>`, and receive decoded values. Everything else — permission
 * classification, the wasm fallback, repeat suppression, torch — is handled here
 * or in the modules underneath.
 *
 * WHY start() MUST COME FROM A GESTURE
 * Two things unlock only inside one: the camera permission prompt, and the
 * AudioContext that produces the scan beep (iOS starts every context suspended).
 * The station puts both behind a single "start shift" tap so a volunteer is asked
 * once, deliberately, before anyone is queueing.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { armDoorAudio } from '@/lib/checkin/feedback';
import {
  closeDoorCamera,
  createDoorDetector,
  hasTorch,
  listDoorCameras,
  openDoorCamera,
  runScanLoop,
  setTorch,
  type CameraError,
  type DoorDetector,
  type ScanLoop,
} from '@/lib/checkin/scanner';
import {
  CAMERA_FAILURE_MESSAGES,
  SCAN_INTERVAL_MS,
  SCAN_REPEAT_MS,
  createScanGate,
  detectScannerSupport,
  orderCamerasForDoor,
  type CameraChoice,
  type CameraFailure,
  type ScannerSupport,
} from '@/lib/checkin/scanner-policy';

export type DoorScannerStatus = 'idle' | 'starting' | 'scanning' | 'failed';

export interface UseDoorScannerOptions {
  /** Called once per accepted code. Repeats of the same code are suppressed. */
  onScan: (rawValue: string) => void;
  /** Suppression window for a repeat of the same code. */
  repeatMs?: number;
}

export function useDoorScanner({ onScan, repeatMs = SCAN_REPEAT_MS }: UseDoorScannerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<ScanLoop | null>(null);
  const detectorRef = useRef<DoorDetector | null>(null);
  const gateRef = useRef(createScanGate(repeatMs));
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const [status, setStatus] = useState<DoorScannerStatus>('idle');
  const [failure, setFailure] = useState<CameraFailure | null>(null);
  const [cameras, setCameras] = useState<CameraChoice[]>([]);
  /**
   * The deviceId of the OPEN stream, read from the track's own settings rather
   * than remembered from the request. The two differ exactly when it matters:
   * `facingMode: environment` on a multi-lens phone resolves to whichever rear
   * lens the browser felt like, and a camera picker that does not know the
   * answer cannot show which lens is live — which is how "I can't switch back"
   * happens: the select is silently showing the wrong current camera.
   */
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [usesWasm, setUsesWasm] = useState(false);

  /**
   * NULL UNTIL MEASURED, not "everything unsupported".
   *
   * `window` does not exist during SSR and reading it in render is a hydration
   * mismatch, so this is filled in on mount. Seeding it with all-false would
   * make the start screen flash "this page is not on https" and "this browser
   * cannot open a camera" on every single load before correcting itself — two
   * alarming claims, both wrong, shown to a volunteer at exactly the moment they
   * are deciding whether the tool works.
   */
  const [support, setSupport] = useState<ScannerSupport | null>(null);
  useEffect(() => {
    setSupport(detectScannerSupport(typeof window === 'undefined' ? undefined : window));
  }, []);

  const teardown = useCallback(() => {
    loopRef.current?.stop();
    loopRef.current = null;
    closeDoorCamera(streamRef.current);
    streamRef.current = null;
    setTorchOn(false);
    setTorchAvailable(false);
    setActiveCameraId(null);
  }, []);

  const start = useCallback(
    async (deviceId?: string): Promise<void> => {
      // Unlock audio on the same gesture that opens the camera. Asking twice, or
      // asking later, means a station with a silent beep and nobody knowing why.
      armDoorAudio();

      teardown();
      setStatus('starting');
      setFailure(null);

      try {
        // Concurrent on purpose: compiling the wasm module and negotiating the
        // camera are independent, and on the wasm path each takes a noticeable
        // moment. Serialising them would double the wait before the first scan.
        const [stream, detector] = await Promise.all([
          openDoorCamera({ deviceId }).catch(async (error: unknown) => {
            // A SPECIFIC camera that will not open must not kill the shift: on
            // some phones a just-released lens reports busy for a moment, and a
            // stale deviceId (the OS re-enumerated) matches nothing. Fall back
            // to the automatic rear-camera choice so the volunteer always lands
            // on a working stream rather than being stuck between lenses.
            if (!deviceId) throw error;
            return openDoorCamera({});
          }),
          detectorRef.current ? Promise.resolve(detectorRef.current) : createDoorDetector(),
        ]);

        streamRef.current = stream;
        detectorRef.current = detector;
        setUsesWasm(detector.usesWasm);

        const video = videoRef.current;
        if (!video) {
          // The element vanished mid-start (the volunteer navigated). Release the
          // camera rather than leaving the recording indicator on.
          closeDoorCamera(stream);
          streamRef.current = null;
          setStatus('idle');
          return;
        }

        video.srcObject = stream;
        video.muted = true;
        // Required on iOS: without it the video takes over the whole screen and
        // the panel underneath becomes unreachable.
        video.playsInline = true;
        await video.play();

        gateRef.current = createScanGate(repeatMs);
        loopRef.current = runScanLoop({
          video,
          detector,
          intervalMs: SCAN_INTERVAL_MS,
          onValue: (value) => {
            if (gateRef.current.accept(value, performance.now())) {
              onScanRef.current(value);
            }
          },
        });

        setTorchAvailable(hasTorch(stream));
        // What the browser ACTUALLY opened, so the picker can mark the live
        // lens. getSettings is universal on camera tracks, but guard anyway.
        const track = stream.getVideoTracks()[0];
        const settings =
          typeof track?.getSettings === 'function' ? track.getSettings() : undefined;
        setActiveCameraId(settings?.deviceId ?? deviceId ?? null);
        setStatus('scanning');

        // Labels are blank until permission has been granted at least once, so
        // this is only worth doing after the stream is open. Re-listed on every
        // start because the OS re-enumerates devices — a list from five minutes
        // ago can hold ids that no longer exist.
        setCameras(orderCamerasForDoor(await listDoorCameras()));
      } catch (error) {
        const failed = (error as CameraError).failure ?? 'unknown';
        setFailure(failed);
        setStatus('failed');
        teardown();
      }
    },
    [repeatMs, teardown]
  );

  const stop = useCallback(() => {
    teardown();
    setStatus('idle');
  }, [teardown]);

  const toggleTorch = useCallback(async () => {
    const next = !torchOn;
    if (await setTorch(streamRef.current, next)) setTorchOn(next);
    else setTorchAvailable(false);
  }, [torchOn]);

  /** Let the volunteer re-present the same badge immediately after dismissing a panel. */
  const clearGate = useCallback(() => {
    gateRef.current.reset();
  }, []);

  // Release the camera when the station closes. A stream left running holds the
  // device and leaves the recording indicator lit on the volunteer's own phone.
  useEffect(() => teardown, [teardown]);

  return {
    videoRef,
    status,
    /** Null unless status is 'failed'. */
    failure,
    failureMessage: failure ? CAMERA_FAILURE_MESSAGES[failure] : null,
    support,
    cameras,
    /** deviceId of the live stream, so the picker can show which lens is on. */
    activeCameraId,
    torchOn,
    torchAvailable,
    /** True when this browser fell back to the WebAssembly decoder. */
    usesWasm,
    start,
    stop,
    toggleTorch,
    clearGate,
  };
}
