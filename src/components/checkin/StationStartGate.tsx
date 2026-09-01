import React from 'react';
import { AlertTriangle, Cpu, Info, ScanLine } from 'lucide-react';
import { Button, Heading, Input } from '@/components/atoms';
import type { ScannerSupport } from '@/lib/checkin/scanner-policy';
import { DOOR_OCCASION_LABELS, type DoorOccasion, type DoorRole } from '@/lib/types/checkin';
import { DOOR_ROLE_LABELS } from '@/lib/types/checkin';

export interface StationStartGateProps {
  occasion: DoorOccasion;
  role: DoorRole;
  staffName: string | null;
  /**
   * Null until the browser has been measured on mount. No warning is shown while
   * it is null — claiming "no camera" before checking would alarm every
   * volunteer on every load.
   */
  support: ScannerSupport | null;
  station: string;
  onStationChange: (value: string) => void;
  onStart: () => void;
  starting?: boolean;
  /** Number of writes left over from a previous session on this device. */
  pendingWrites?: number;
  className?: string;
}

/**
 * The one deliberate tap that starts a shift.
 *
 * WHY A GATE AT ALL, GIVEN THE GOAL IS FEWER TAPS
 * Two things unlock only inside a real user gesture: the camera permission
 * prompt and the AudioContext that produces the scan beep, which iOS starts
 * suspended. Trying either on mount gets one denied and the other silently
 * muted. Putting both behind a single tap means the volunteer is asked once,
 * before anyone is queueing, rather than mid-scan with a person waiting.
 *
 * It also collects the station label. That is the only field, it is remembered,
 * and it exists because the audit trail and the live dashboard are close to
 * useless without knowing which door a scan came from.
 */
export const StationStartGate: React.FC<StationStartGateProps> = ({
  occasion,
  role,
  staffName,
  support,
  station,
  onStationChange,
  onStart,
  starting = false,
  pendingWrites = 0,
  className = '',
}) => (
  <div className={`mx-auto w-full max-w-md space-y-5 ${className}`}>
    <div className="rounded-2xl bg-surface-card p-6 text-center">
      <ScanLine className="mx-auto mb-4 h-10 w-10 text-brand-primary" aria-hidden="true" />
      <Heading level="h1" className="mb-1 text-2xl font-bold">
        {DOOR_OCCASION_LABELS[occasion]}
      </Heading>
      <p className="text-text-secondary">
        {staffName ? `${staffName} · ` : ''}
        {DOOR_ROLE_LABELS[role]}
      </p>
    </div>

    {pendingWrites > 0 ? (
      <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <p className="text-sm text-text-secondary">
          {pendingWrites} check-in{pendingWrites === 1 ? '' : 's'} from earlier still needs to
          reach the server. Starting the shift sends them.
        </p>
      </div>
    ) : null}

    {support && !support.secureContext ? (
      <div className="flex items-start gap-3 rounded-xl border border-error/40 bg-error/10 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
        <p className="text-sm text-text-secondary">
          {/* On http the camera silently does not exist rather than being denied,
              which reads as a broken phone unless it is named. */}
          This page is not on https, so the camera cannot open. Use the https address rather
          than an IP.
        </p>
      </div>
    ) : null}

    {support?.secureContext && !support.camera ? (
      <div className="flex items-start gap-3 rounded-xl border border-error/40 bg-error/10 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
        <p className="text-sm text-text-secondary">
          This browser cannot open a camera. You can still work the lookup desk.
        </p>
      </div>
    ) : null}

    {support?.camera && !support.nativeDetector ? (
      <div className="flex items-start gap-3 rounded-xl border border-info/40 bg-info/10 px-4 py-3">
        <Cpu className="mt-0.5 h-5 w-5 shrink-0 text-info" aria-hidden="true" />
        <p className="text-sm text-text-secondary">
          {/* Safari has no BarcodeDetector, so this is every iPhone. Saying so
              once beats a volunteer wondering why the first scan took a beat. */}
          This phone uses the built-in decoder. The first scan takes a moment longer while it
          loads; everything after is the same speed.
        </p>
      </div>
    ) : null}

    <div className="rounded-2xl bg-surface-card p-6">
      <label htmlFor="door-station" className="mb-2 block text-sm font-semibold text-text-primary">
        Which door are you on?
      </label>
      <Input
        id="door-station"
        value={station}
        onChange={(event) => onStationChange(event.target.value)}
        placeholder="Main entrance"
        maxLength={60}
        autoCapitalize="words"
        fullWidth
      />
      <p className="mt-2 flex items-start gap-2 text-xs text-text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Recorded with every scan, so a lead can see which door is backing up.
      </p>
    </div>

    <Button
      variant="primary"
      size="lg"
      className="w-full"
      loading={starting}
      onClick={onStart}
    >
      Start scanning
    </Button>

    <p className="text-center text-xs text-text-muted">
      Your phone will ask for camera access. Allow it once and the camera stays open for the
      whole shift.
    </p>
  </div>
);
