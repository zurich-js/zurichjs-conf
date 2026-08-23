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
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [usesWasm, setUsesWasm] = useState(false);

  // Read once on mount rather than during render: `window` does not exist on the
  // server, and reading it in render would produce a hydration mismatch.
  const [support, setSupport] = useState(() => detectScannerSupport(undefined));
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
          openDoorCamera({ deviceId }),
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
        setStatus('scanning');

        // Labels are blank until permission has been granted at least once, so
        // this is only worth doing after the stream is open.
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
