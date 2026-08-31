import React from 'react';
import { AlertCircle, Camera, Flashlight, FlashlightOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import type { CameraChoice } from '@/lib/checkin/scanner-policy';
import type { DoorScannerStatus } from '@/hooks/checkin/useDoorScanner';

export interface ScannerViewportProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: DoorScannerStatus;
  /** Set when the camera could not be opened; already phrased for a volunteer. */
  failureMessage?: string | null;
  onRetry?: () => void;
  torchAvailable?: boolean;
  torchOn?: boolean;
  onToggleTorch?: () => void;
  cameras?: CameraChoice[];
  onPickCamera?: (deviceId: string) => void;
  className?: string;
}

/**
 * The live camera, and the frame a volunteer aims with.
 *
 * KEPT SHORT ON PURPOSE. The video occupies a fixed aspect box rather than the
 * viewport: the attendee panel below it is what the volunteer reads, and a
 * full-screen camera would push the verdict off the bottom of a phone. A door
 * scan is aim-and-glance, not composition.
 *
 * The video is never unmounted while a shift is running — the parent keeps this
 * mounted and toggles what sits under it — because tearing down the element
 * releases the camera and the next scan pays for another permission handshake.
 */
export const ScannerViewport: React.FC<ScannerViewportProps> = ({
  videoRef,
  status,
  failureMessage,
  onRetry,
  torchAvailable = false,
  torchOn = false,
  onToggleTorch,
  cameras = [],
  onPickCamera,
  className = '',
}) => (
  <div className={`space-y-3 ${className}`}>
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        // playsInline is set imperatively too; both are needed because iOS reads
        // the attribute at load time and would otherwise take over the screen.
        playsInline
        muted
        // Decorative: the QR is machine-read and every outcome is announced by
        // the banner's live region, so a description here would be noise.
        aria-hidden="true"
        className="h-full w-full object-cover"
      />

      {/* The aiming frame. Sized to where a held-up badge actually lands, which
          is nearer the middle than people expect. */}
      {status === 'scanning' ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="h-[55%] w-[70%] rounded-xl border-2 border-brand-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
      ) : null}

      {status === 'starting' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" aria-hidden="true" />
          <p className="text-sm text-text-secondary">Opening the camera…</p>
        </div>
      ) : null}

      {status === 'failed' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-error" aria-hidden="true" />
          <p className="text-sm text-text-secondary">{failureMessage}</p>
          {onRetry ? (
            <Button variant="dark" size="sm" onClick={onRetry}>
              Try the camera again
            </Button>
          ) : null}
        </div>
      ) : null}

      {status === 'idle' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <Camera className="h-8 w-8 text-text-muted" aria-hidden="true" />
        </div>
      ) : null}
    </div>

    {status === 'scanning' ? (
      <div className="flex flex-wrap items-center gap-2">
        {torchAvailable ? (
          <Button
            variant="dark"
            size="sm"
            onClick={onToggleTorch}
            aria-pressed={torchOn}
            className="min-h-11"
          >
            {torchOn ? (
              <FlashlightOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Flashlight className="h-4 w-4" aria-hidden="true" />
            )}
            {torchOn ? 'Light off' : 'Light on'}
          </Button>
        ) : null}

        {/* Only offered when there is a real choice. A phone reports three or
            four rear lenses and the one picked automatically cannot always focus
            at badge distance. */}
        {cameras.length > 1 && onPickCamera ? (
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <span className="sr-only">Choose a camera</span>
            <select
              className="min-h-11 rounded-xl bg-surface-card px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
              onChange={(event) => onPickCamera(event.target.value)}
            >
              {cameras.map((camera, index) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    ) : null}
  </div>
);
