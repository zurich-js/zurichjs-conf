import { describe, it, expect } from 'vitest';
import {
  CAMERA_FAILURE_MESSAGES,
  SCAN_MAX_EDGE,
  SCAN_REPEAT_MS,
  classifyCameraError,
  createScanGate,
  detectScannerSupport,
  fitWithin,
  orderCamerasForDoor,
} from '../scanner-policy';

// ─────────────────────────────────────────────────────────────────────────────
// The repeat gate
// ─────────────────────────────────────────────────────────────────────────────

describe('createScanGate', () => {
  it('accepts a code once and swallows the frames that follow it', () => {
    // At 10 fps one badge is read ~25 times while the volunteer lowers it. Every
    // one of those would be a request on the worst network of the year.
    const gate = createScanGate(SCAN_REPEAT_MS);

    expect(gate.accept('ticket-a', 0)).toBe(true);
    expect(gate.accept('ticket-a', 100)).toBe(false);
    expect(gate.accept('ticket-a', 1000)).toBe(false);
    expect(gate.accept('ticket-a', 2499)).toBe(false);
  });

  it('accepts the same code again once the window has passed', () => {
    const gate = createScanGate(SCAN_REPEAT_MS);

    expect(gate.accept('ticket-a', 0)).toBe(true);
    expect(gate.accept('ticket-a', SCAN_REPEAT_MS)).toBe(true);
  });

  it('accepts a DIFFERENT code immediately', () => {
    // Two attendees presenting badges back to back is the normal case. Making the
    // second wait out the first one's window would be the worst possible bug.
    const gate = createScanGate(SCAN_REPEAT_MS);

    expect(gate.accept('ticket-a', 0)).toBe(true);
    expect(gate.accept('ticket-b', 50)).toBe(true);
    expect(gate.accept('ticket-c', 80)).toBe(true);
  });

  it('re-accepts an earlier code after another one intervenes', () => {
    // Re-presenting A after B is a deliberate act, not a stuck frame.
    const gate = createScanGate(SCAN_REPEAT_MS);

    gate.accept('ticket-a', 0);
    gate.accept('ticket-b', 50);
    expect(gate.accept('ticket-a', 100)).toBe(true);
  });

  it('restarts the window from the accepted scan, not the first sighting', () => {
    const gate = createScanGate(1000);

    expect(gate.accept('ticket-a', 0)).toBe(true);
    expect(gate.accept('ticket-a', 900)).toBe(false);
    expect(gate.accept('ticket-a', 1000)).toBe(true);
    // The window now runs from 1000, not from 0.
    expect(gate.accept('ticket-a', 1500)).toBe(false);
    expect(gate.accept('ticket-a', 2000)).toBe(true);
  });

  it('lets the same badge be re-scanned straight after a reset', () => {
    // The volunteer dismissed the panel and is deliberately looking again.
    const gate = createScanGate(SCAN_REPEAT_MS);

    expect(gate.accept('ticket-a', 0)).toBe(true);
    gate.reset();
    expect(gate.accept('ticket-a', 10)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Downscaling
// ─────────────────────────────────────────────────────────────────────────────

describe('fitWithin', () => {
  it('scales a 720p frame to the detector budget, preserving aspect ratio', () => {
    expect(fitWithin({ width: 1280, height: 720 }, 960)).toEqual({ width: 960, height: 540 });
  });

  it('scales by the LONGEST edge, whichever way the phone is held', () => {
    // Portrait. Scaling by width would leave a 1707px tall frame.
    expect(fitWithin({ width: 720, height: 1280 }, 960)).toEqual({ width: 540, height: 960 });
  });

  it('never upscales', () => {
    // Enlarging a 480p stream adds pixels without adding detail, and costs the
    // decoder time for nothing.
    expect(fitWithin({ width: 640, height: 480 }, 960)).toEqual({ width: 640, height: 480 });
  });

  it('handles a video element that has no dimensions yet', () => {
    expect(fitWithin({ width: 0, height: 0 }, 960)).toEqual({ width: 0, height: 0 });
  });

  it('never produces a zero edge from a very lopsided frame', () => {
    const result = fitWithin({ width: 4000, height: 3 }, 960);
    expect(result.width).toBe(960);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });

  it('defaults to the documented budget', () => {
    expect(fitWithin({ width: 4032, height: 3024 })).toEqual({
      width: SCAN_MAX_EDGE,
      height: 720,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Camera ordering
// ─────────────────────────────────────────────────────────────────────────────

function device(label: string, deviceId = label, kind: MediaDeviceKind = 'videoinput') {
  return { deviceId, kind, label, groupId: 'g', toJSON: () => ({}) } as MediaDeviceInfo;
}

describe('orderCamerasForDoor', () => {
  it('drops microphones and speakers', () => {
    const ordered = orderCamerasForDoor([
      device('Back Camera'),
      device('Default - Microphone', 'mic', 'audioinput'),
      device('Speakers', 'spk', 'audiooutput'),
    ]);

    expect(ordered).toHaveLength(1);
    expect(ordered[0]?.label).toBe('Back Camera');
  });

  it('puts the plain rear camera first on a multi-lens phone', () => {
    // The ultra-wide typically cannot focus closer than ~10cm, so a badge held at
    // reading distance never resolves on it — and it is often what the browser
    // hands back for facingMode: environment.
    const ordered = orderCamerasForDoor([
      device('Front Camera'),
      device('Back Ultra Wide Camera'),
      device('Back Camera'),
      device('Back Telephoto Camera'),
    ]);

    expect(ordered.map((c) => c.label)).toEqual([
      'Back Camera',
      'Back Telephoto Camera',
      'Back Ultra Wide Camera',
      'Front Camera',
    ]);
  });

  it('ranks the front camera last, since it cannot see the badge', () => {
    const ordered = orderCamerasForDoor([device('User facing'), device('camera2 0, facing back')]);
    expect(ordered[ordered.length - 1]?.label).toBe('User facing');
  });

  it('keeps unlabelled cameras ahead of the front one', () => {
    // Labels are empty until permission has been granted, so an unknown camera is
    // more likely to be usable than one we know faces the wrong way.
    const ordered = orderCamerasForDoor([device('front', 'a'), device('', 'b')]);
    expect(ordered[0]?.deviceId).toBe('b');
  });

  it('does not mutate its input', () => {
    const devices = [device('Front Camera'), device('Back Camera')];
    orderCamerasForDoor(devices);
    expect(devices[0]?.label).toBe('Front Camera');
  });

  it('returns nothing when there is no camera', () => {
    expect(orderCamerasForDoor([])).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Capability and error classification
// ─────────────────────────────────────────────────────────────────────────────

describe('detectScannerSupport', () => {
  it('reports a modern Android browser as fully capable', () => {
    expect(
      detectScannerSupport({
        isSecureContext: true,
        navigator: { mediaDevices: { getUserMedia: () => undefined } },
        BarcodeDetector: function BarcodeDetector() {},
      })
    ).toEqual({ camera: true, nativeDetector: true, secureContext: true });
  });

  it('reports Safari as having a camera but no native detector', () => {
    // Safari has never shipped the Shape Detection API, on any version, on either
    // platform — so roughly half the crew is on the WebAssembly path.
    expect(
      detectScannerSupport({
        isSecureContext: true,
        navigator: { mediaDevices: { getUserMedia: () => undefined } },
      })
    ).toEqual({ camera: true, nativeDetector: false, secureContext: true });
  });

  it('separates an insecure context from a missing camera', () => {
    // On plain http the camera silently does not exist rather than being denied,
    // which reads as a broken phone unless it is called out.
    expect(detectScannerSupport({ isSecureContext: false, navigator: {} })).toEqual({
      camera: false,
      nativeDetector: false,
      secureContext: false,
    });
  });

  it('is safe on the server, where there is no window', () => {
    expect(detectScannerSupport(undefined)).toEqual({
      camera: false,
      nativeDetector: false,
      secureContext: false,
    });
  });
});

describe('classifyCameraError', () => {
  function named(name: string): Error {
    const error = new Error(name);
    error.name = name;
    return error;
  }

  it.each([
    ['NotAllowedError', 'denied'],
    ['SecurityError', 'denied'],
    ['NotFoundError', 'not_found'],
    ['OverconstrainedError', 'not_found'],
    ['NotReadableError', 'in_use'],
    ['AbortError', 'in_use'],
    ['TypeError', 'insecure_context'],
  ] as const)('maps %s to %s', (name, expected) => {
    expect(classifyCameraError(named(name))).toBe(expected);
  });

  it('falls back to unknown for anything else', () => {
    expect(classifyCameraError(named('WeirdError'))).toBe('unknown');
    expect(classifyCameraError('a string')).toBe('unknown');
    expect(classifyCameraError(null)).toBe('unknown');
  });

  it('has a message a volunteer can act on for every failure', () => {
    for (const message of Object.values(CAMERA_FAILURE_MESSAGES)) {
      expect(message.length).toBeGreaterThan(20);
    }
    // The in-use case names the actual culprit: the volunteer's own camera app,
    // still open from the flow this replaces.
    expect(CAMERA_FAILURE_MESSAGES.in_use).toContain('camera app');
  });
});
