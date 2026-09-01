/**
 * The decisions the scanner makes, separated from the browser APIs it makes them
 * with.
 *
 * Everything here is pure. That matters because the interesting failures at a
 * door are policy failures, not API failures: the same badge firing forty times
 * a second, the front camera being picked on a phone with three lenses, a frame
 * downscaled until the QR stops resolving. Those are all testable without a
 * camera, and they are all tested.
 */

/**
 * How long the same code is ignored after it has been accepted.
 *
 * A detector run at 10 fps will read one badge 25 times while the volunteer is
 * still lowering it. Without a gate the station would fire 25 check-ins — all
 * but the first returning `duplicate`, so nothing is corrupted, but the panel
 * would flicker, the beep would machine-gun, and the queue would burn 25
 * requests per attendee on the worst network of the year.
 *
 * 2.5s is long enough to cover a badge lingering in frame and short enough that
 * a deliberate re-scan of the same person — the volunteer checking what it says
 * — feels responsive.
 */
export const SCAN_REPEAT_MS = 2500;

/**
 * How often detection runs, independent of the display frame rate.
 *
 * The camera delivers 30-60 fps. Detecting on every frame would pin the CPU of a
 * volunteer's personal phone for a two-hour door, and phones respond to that by
 * thermal-throttling — which makes the scanner slower exactly when the queue is
 * longest. 10 fps is far faster than a human can present a badge.
 */
export const SCAN_INTERVAL_MS = 100;

/**
 * Longest edge fed to the WebAssembly detector.
 *
 * Not arbitrary. A QR at arm's length occupies roughly a sixth of the frame
 * width, and a version-3 code is 29 modules across; at a 960px longest edge that
 * leaves about 5 pixels per module, comfortably above the 2-3 the decoder needs.
 * Dropping to 640 halves the pixel work but takes it to ~3.4, which starts
 * failing on a scuffed print or a dim foyer — the two conditions guaranteed to
 * be present.
 */
export const SCAN_MAX_EDGE = 960;

export interface ScanGate {
  /** True if this value should be acted on now. */
  accept(value: string, nowMs: number): boolean;
  /** Forget the last value, e.g. after the volunteer dismisses the panel. */
  reset(): void;
}

/**
 * Suppress repeats of the same code without suppressing a genuinely new one.
 *
 * A DIFFERENT code is always accepted immediately: two attendees presenting
 * badges back to back is the normal case at a door, and making the second wait
 * out the first one's window would be the single most infuriating possible bug.
 */
export function createScanGate(repeatMs: number = SCAN_REPEAT_MS): ScanGate {
  let lastValue: string | null = null;
  let lastAt = 0;

  return {
    accept(value, nowMs) {
      if (value !== lastValue || nowMs - lastAt >= repeatMs) {
        lastValue = value;
        lastAt = nowMs;
        return true;
      }
      return false;
    },
    reset() {
      lastValue = null;
      lastAt = 0;
    },
  };
}

export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Scale a frame down to fit within `maxEdge`, preserving aspect ratio.
 *
 * Never upscales: enlarging a 480p stream adds pixels without adding detail and
 * costs the decoder time for nothing.
 */
export function fitWithin(source: Dimensions, maxEdge: number = SCAN_MAX_EDGE): Dimensions {
  const longest = Math.max(source.width, source.height);
  if (longest <= 0) return { width: 0, height: 0 };
  if (longest <= maxEdge) return { width: source.width, height: source.height };

  const scale = maxEdge / longest;
  return {
    // Round rather than floor: a half-pixel loss on both axes is a visible crop
    // at the frame edge, which is exactly where a hand-held badge tends to sit.
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
  };
}

export interface CameraChoice {
  deviceId: string;
  label: string;
}

/**
 * Pick the rear camera from an enumerated device list.
 *
 * WHY NOT JUST facingMode: 'environment'
 * That constraint is the primary mechanism and is tried first — but a modern
 * phone reports three or four rear lenses (wide, ultra-wide, telephoto) and the
 * one the browser hands back for `environment` is not always the one that can
 * focus at badge distance; an ultra-wide typically cannot focus closer than
 * ~10 cm and renders a QR too small to resolve. When the volunteer needs to
 * override, this is the list they choose from, ordered so the plain rear camera
 * comes first.
 *
 * Labels are the only signal available before opening a stream, and they are
 * vendor strings, so this is a heuristic and is treated as one: it orders the
 * list, it does not hide anything.
 */
export function orderCamerasForDoor(devices: readonly MediaDeviceInfo[]): CameraChoice[] {
  const cameras = devices
    .filter((device) => device.kind === 'videoinput')
    .map((device) => ({ deviceId: device.deviceId, label: device.label }));

  const score = (label: string): number => {
    const lower = label.toLowerCase();
    // An ultra-wide cannot focus at badge distance, so it goes last even though
    // it is often what `environment` selects on a multi-lens phone.
    if (lower.includes('ultra')) return 3;
    if (lower.includes('front') || lower.includes('user') || lower.includes('face')) return 4;
    if (lower.includes('back') || lower.includes('rear') || lower.includes('environment')) {
      return 0;
    }
    if (lower.includes('tele') || lower.includes('zoom')) return 2;
    return 1;
  };

  return [...cameras].sort((a, b) => score(a.label) - score(b.label));
}

export interface ScannerSupport {
  /** Whether a camera can be opened at all. */
  camera: boolean;
  /** Whether the browser has a native BarcodeDetector, so no wasm is needed. */
  nativeDetector: boolean;
  /** Whether a secure context is available. getUserMedia requires one. */
  secureContext: boolean;
}

/**
 * What this browser can do, from an injected global so it is testable.
 *
 * `secureContext` is called out separately because its failure mode is
 * confusing: on plain http the camera silently does not exist rather than being
 * denied, which reads as a broken phone. A station opened over http on the
 * venue's LAN needs to be told the actual reason.
 */
export function detectScannerSupport(
  scope: {
    isSecureContext?: boolean;
    navigator?: { mediaDevices?: { getUserMedia?: unknown } };
    BarcodeDetector?: unknown;
  } | undefined
): ScannerSupport {
  if (!scope) return { camera: false, nativeDetector: false, secureContext: false };

  return {
    camera: typeof scope.navigator?.mediaDevices?.getUserMedia === 'function',
    nativeDetector: typeof scope.BarcodeDetector === 'function',
    secureContext: scope.isSecureContext === true,
  };
}

/** Why the camera could not be opened, in words a volunteer can act on. */
export type CameraFailure =
  | 'denied'
  | 'not_found'
  | 'in_use'
  | 'insecure_context'
  | 'unsupported'
  | 'unknown';

export const CAMERA_FAILURE_MESSAGES: Record<CameraFailure, string> = {
  denied:
    'Camera access was blocked. Open this page’s site settings, allow the camera, then reload.',
  not_found: 'No camera found on this device. Use the lookup desk instead.',
  in_use:
    'Another app is using the camera. Close it — the camera app itself is the usual culprit — then reload.',
  insecure_context:
    'The camera only works over https. Open the station on the https address, not an IP.',
  unsupported: 'This browser cannot open a camera. Chrome or Safari on the phone will work.',
  unknown: 'The camera could not be started. Reload, and use the lookup desk if it persists.',
};

/**
 * Classify a getUserMedia rejection.
 *
 * The names come from the Media Capture spec: `NotAllowedError` for a refused
 * permission, `NotFoundError` for no device, `NotReadableError` when the OS has
 * given the camera to something else — which at a door is nearly always the
 * volunteer's own camera app, still open from the flow this replaces.
 */
export function classifyCameraError(error: unknown): CameraFailure {
  const name = error instanceof Error ? error.name : '';

  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'not_found';
    case 'NotReadableError':
    case 'AbortError':
      return 'in_use';
    case 'TypeError':
      // getUserMedia rejects with TypeError when there is no secure context.
      return 'insecure_context';
    default:
      return 'unknown';
  }
}
