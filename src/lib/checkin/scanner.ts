/**
 * The embedded scanner.
 *
 * WHY EMBEDDED AT ALL
 * The flow this replaces is: point the phone's camera app at the badge, wait for
 * a notification banner, tap it, wait for a page to load, tap check-in. Four
 * interactions and two cold loads per attendee. Here the camera opens once at
 * the start of a shift and stays open: a scan resolves in memory, the panel
 * appears in place, and the volunteer taps once. Nothing navigates, ever —
 * a route change tears down the video track and costs another permission
 * handshake.
 *
 * WHY A PONYFILL AND NOT JUST BarcodeDetector
 * Chrome on Android has the Shape Detection API; Safari has never shipped it, on
 * any version, on either platform. Volunteers are on their own phones, so
 * roughly half the crew has no native detector at all. `barcode-detector` fills
 * that gap with a WebAssembly build of zxing — 1.1 MB, served from our own origin
 * (see scripts/copy-scanner-wasm.mjs) and loaded ONLY when the native API is
 * missing, so an Android station never pays for it.
 *
 * The pure decisions — how often to detect, when to ignore a repeat, how far to
 * downscale — live in scanner-policy.ts and are tested there.
 */

import { logger } from '@/lib/logger';
import {
  SCAN_MAX_EDGE,
  classifyCameraError,
  fitWithin,
  type CameraFailure,
} from './scanner-policy';

const log = logger.scope('Door Scanner');

/** Where the copied wasm is served from. Same origin, so the venue's wifi cannot break it. */
const WASM_URL = '/scanner/zxing_reader.wasm';

// ─────────────────────────────────────────────────────────────────────────────
// Detector
// ─────────────────────────────────────────────────────────────────────────────

interface DetectedCode {
  rawValue: string;
}

interface NativeBarcodeDetector {
  detect(source: CanvasImageSource): Promise<DetectedCode[]>;
}

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => NativeBarcodeDetector;

export interface DoorDetector {
  detect(source: CanvasImageSource): Promise<string[]>;
  /** True when this is the WebAssembly fallback, which wants a downscaled frame. */
  readonly usesWasm: boolean;
}

function nativeDetectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
    .BarcodeDetector;
  return typeof candidate === 'function' ? candidate : null;
}

/**
 * Only QR. The badges carry nothing else, and every extra format is another set
 * of hypotheses the decoder tests on every single frame — on the wasm path that
 * is directly proportional to how long a volunteer waits.
 */
const QR_ONLY = 'qr_code';

/**
 * Build a detector, preferring the browser's own.
 *
 * The wasm import is dynamic so it is never in the initial bundle: a station on
 * Android must not download a megabyte it will not execute, and neither must any
 * other page on the site.
 */
export async function createDoorDetector(): Promise<DoorDetector> {
  const Native = nativeDetectorCtor();

  if (Native) {
    const detector = new Native({ formats: [QR_ONLY] });
    log.info('Using the native BarcodeDetector');
    return {
      usesWasm: false,
      detect: async (source) => (await detector.detect(source)).map((code) => code.rawValue),
    };
  }

  const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill');

  // Point the module at our own copy. Without this the library fetches it from
  // jsDelivr on first use, which makes the door depend on a third-party CDN
  // being reachable from the venue at the moment the queue forms.
  // Instantiate now rather than on the first scan: compiling a megabyte of wasm
  // takes a beat and it must not be the first attendee who waits for it. The
  // promise is deliberately not awaited — the detector queues behind it anyway —
  // but a rejection is reported, because the likeliest cause is the copied wasm
  // missing from public/, and that must not surface as "scans do not work".
  void prepareZXingModule({
    overrides: {
      locateFile: (filename: string, prefix: string) =>
        filename.endsWith('.wasm') ? WASM_URL : `${prefix}${filename}`,
    },
    fireImmediately: true,
  }).catch((error: unknown) => {
    log.error('Could not instantiate the barcode WebAssembly module', error, {
      wasmUrl: WASM_URL,
    });
  });

  const detector = new BarcodeDetector({ formats: [QR_ONLY] });
  log.info('Using the WebAssembly barcode detector');

  return {
    usesWasm: true,
    detect: async (source) => (await detector.detect(source)).map((code) => code.rawValue),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Camera
// ─────────────────────────────────────────────────────────────────────────────

export interface OpenCameraOptions {
  /** Override the automatic choice, from `orderCamerasForDoor`. */
  deviceId?: string;
}

export interface CameraError extends Error {
  failure: CameraFailure;
}

function cameraError(failure: CameraFailure, cause: unknown): CameraError {
  const error = new Error(`Camera failed: ${failure}`) as CameraError;
  error.failure = failure;
  error.cause = cause;
  return error;
}

/**
 * Open the rear camera.
 *
 * 1280x720 ideal, not "as high as possible". A 4K stream costs battery and
 * decode time without helping: a QR that fills a sixth of the frame is already
 * hundreds of pixels across at 720p. `focusMode: continuous` is requested as a
 * non-fatal extra — a fixed-focus stream is the most common reason a badge sits
 * in frame and never resolves.
 */
export async function openDoorCamera(options: OpenCameraOptions = {}): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw cameraError('unsupported', null);
  }

  const video: MediaTrackConstraints = options.deviceId
    ? { deviceId: { exact: options.deviceId } }
    : { facingMode: { ideal: 'environment' } };

  video.width = { ideal: 1280 };
  video.height = { ideal: 720 };
  // Not in the TS lib and not universally supported; harmless where it is not.
  (video as Record<string, unknown>).focusMode = 'continuous';

  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio: false });
  } catch (error) {
    const failure = classifyCameraError(error);
    log.error('Could not open the camera', error, { failure });
    throw cameraError(failure, error);
  }
}

export function closeDoorCamera(stream: MediaStream | null): void {
  // Every track, explicitly. A stream left running holds the camera and shows
  // the recording indicator, and on iOS the next getUserMedia can then fail with
  // NotReadableError — which reads to a volunteer as a broken phone.
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * List cameras.
 *
 * Labels are empty until permission has been granted at least once, which is why
 * this is called AFTER the stream opens rather than before.
 */
export async function listDoorCameras(): Promise<MediaDeviceInfo[]> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return [];
  try {
    return await navigator.mediaDevices.enumerateDevices();
  } catch {
    return [];
  }
}

/** Whether this stream's camera has a controllable torch. Chrome on Android only. */
export function hasTorch(stream: MediaStream | null): boolean {
  const track = stream?.getVideoTracks()[0];
  if (!track || typeof track.getCapabilities !== 'function') return false;
  return 'torch' in (track.getCapabilities() as Record<string, unknown>);
}

/**
 * Toggle the torch.
 *
 * Worth having: a foyer at 08:00 in September is dim, and a phone that drops to
 * a long exposure motion-blurs a hand-held badge into something no decoder can
 * read.
 */
export async function setTorch(stream: MediaStream | null, on: boolean): Promise<boolean> {
  const track = stream?.getVideoTracks()[0];
  if (!track) return false;

  try {
    await track.applyConstraints({
      advanced: [{ torch: on } as unknown as MediaTrackConstraintSet],
    });
    return true;
  } catch (error) {
    log.warn('Torch not available on this camera', {
      reason: error instanceof Error ? error.name : 'unknown',
    });
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Frame pump
// ─────────────────────────────────────────────────────────────────────────────

interface VideoFrameCallbackHost {
  requestVideoFrameCallback?: (callback: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
}

export interface ScanLoop {
  stop(): void;
}

export interface ScanLoopOptions {
  video: HTMLVideoElement;
  detector: DoorDetector;
  /** Called for every decoded value; the gate that suppresses repeats is the caller's. */
  onValue: (value: string) => void;
  /** Minimum gap between detection attempts. */
  intervalMs: number;
  onError?: (error: unknown) => void;
}

/**
 * Pump frames into the detector.
 *
 * `requestVideoFrameCallback` is used where it exists because it fires once per
 * DECODED VIDEO FRAME rather than once per display repaint: it skips work when
 * the camera is slower than the screen, and — the part that matters on a phone —
 * it stops entirely when the tab is hidden. `requestAnimationFrame` is the
 * fallback and has the same backgrounding behaviour; a `setInterval` would not,
 * and would keep decoding in a pocket.
 *
 * Detection is serialised: a frame arriving while the previous decode is still
 * running is dropped rather than queued. On the wasm path a decode can exceed
 * the frame interval, and queueing would build an unbounded backlog of stale
 * frames — the scanner would appear to lag further behind the longer it ran.
 */
export function runScanLoop({
  video,
  detector,
  onValue,
  intervalMs,
  onError,
}: ScanLoopOptions): ScanLoop {
  let stopped = false;
  let busy = false;
  let lastAt = 0;
  let handle: number | null = null;
  let rafHandle: number | null = null;

  // Reused across every frame. Allocating a canvas per frame would churn tens of
  // megabytes a minute through the GC on the device least able to afford it.
  let canvas: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;

  const host = video as unknown as VideoFrameCallbackHost;
  const useFrameCallback = typeof host.requestVideoFrameCallback === 'function';

  function sourceFor(): CanvasImageSource | null {
    // The native detector reads the video element directly, which lets the
    // browser use its own optimised path and avoids a GPU readback entirely.
    if (!detector.usesWasm) return video;

    const size = fitWithin(
      { width: video.videoWidth, height: video.videoHeight },
      SCAN_MAX_EDGE
    );
    if (size.width === 0 || size.height === 0) return null;

    canvas ??= document.createElement('canvas');
    if (canvas.width !== size.width || canvas.height !== size.height) {
      canvas.width = size.width;
      canvas.height = size.height;
      // Re-fetching the context after a resize is not required, but the context
      // is created lazily and this is the one place the size is known.
      context = canvas.getContext('2d', { willReadFrequently: true });
    }
    context ??= canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

    context.drawImage(video, 0, 0, size.width, size.height);
    return canvas;
  }

  async function attempt(now: number): Promise<void> {
    if (busy || now - lastAt < intervalMs) return;
    if (video.readyState < 2 || video.videoWidth === 0) return;

    busy = true;
    lastAt = now;
    try {
      const source = sourceFor();
      if (source) {
        for (const value of await detector.detect(source)) {
          if (!stopped) onValue(value);
        }
      }
    } catch (error) {
      // A single failed decode is normal — a blurred or half-visible frame. Only
      // report it; never stop the loop, or one bad frame ends the shift.
      onError?.(error);
    } finally {
      busy = false;
    }
  }

  function tick(): void {
    if (stopped) return;
    void attempt(performance.now());
    schedule();
  }

  function schedule(): void {
    if (stopped) return;
    if (useFrameCallback && host.requestVideoFrameCallback) {
      handle = host.requestVideoFrameCallback(tick);
    } else {
      rafHandle = requestAnimationFrame(tick);
    }
  }

  schedule();

  return {
    stop() {
      stopped = true;
      if (handle !== null && host.cancelVideoFrameCallback) {
        host.cancelVideoFrameCallback(handle);
      }
      if (rafHandle !== null) cancelAnimationFrame(rafHandle);
    },
  };
}
