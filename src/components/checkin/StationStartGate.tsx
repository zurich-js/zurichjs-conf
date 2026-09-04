import React from 'react';
import { AlertTriangle, Cpu, Info, ScanLine } from 'lucide-react';
import { Button, Heading } from '@/components/atoms';
import type { ScannerSupport } from '@/lib/checkin/scanner-policy';
import {
  DOOR_OCCASIONS,
  DOOR_OCCASION_DATES,
  DOOR_OCCASION_LABELS,
  DOOR_OCCASION_TASKS,
  DOOR_ROLE_LABELS,
  type DoorOccasion,
  type DoorRole,
} from '@/lib/types/checkin';

export interface StationStartGateProps {
  /** The day the volunteer is checking people in FOR. */
  occasion: DoorOccasion;
  /** What the server's clock says today is, so a mismatch can be called out. */
  serverOccasion: DoorOccasion;
  onOccasionChange: (occasion: DoorOccasion) => void;
  role: DoorRole;
  staffName: string | null;
  /**
   * Null until the browser has been measured on mount. No warning is shown while
   * it is null — claiming "no camera" before checking would alarm every
   * volunteer on every load.
   */
  support: ScannerSupport | null;
  onStart: () => void;
  starting?: boolean;
  /** Number of writes left over from a previous session on this device. */
  pendingWrites?: number;
  className?: string;
}

/**
 * "Wed 10 Sep" from the occasion's fixed calendar date.
 *
 * Precomputed at module scope to avoid constructing Date objects during render,
 * which would cause hydration mismatches. The underlying dates are static
 * constants, so this is safe.
 */
const DOOR_OCCASION_DATE_LABELS: Record<DoorOccasion, string> = (() => {
  const format = (occasion: DoorOccasion): string => {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'Europe/Zurich',
      }).format(new Date(`${DOOR_OCCASION_DATES[occasion]}T12:00:00Z`));
    } catch {
      return DOOR_OCCASION_DATES[occasion];
    }
  };
  return {
    community_day: format('community_day'),
    workshop_day: format('workshop_day'),
    conference_day: format('conference_day'),
  };
})();

/**
 * The one deliberate tap that starts a shift.
 *
 * WHY A GATE AT ALL, GIVEN THE GOAL IS FEWER TAPS
 * Two things unlock only inside a real user gesture: the camera permission
 * prompt and the AudioContext that produces the scan beep, which iOS starts
 * suspended. Putting both behind a single tap means the volunteer is asked once,
 * before anyone is queueing, rather than mid-scan with a person waiting.
 *
 * It also collects the DAY being worked, and each choice says what the station
 * will do on it — the warm-up meetup hands badges and never checks anyone in,
 * so the label alone is not enough. The server's clock preselects; the
 * volunteer's explicit choice wins. Writing the wrong day into the audit trail
 * is the one mistake this screen exists to prevent.
 *
 * ORDER OF NOTICES: anything that stops the shift (no https, no camera) sits
 * above the button; the built-in decoder note is a "nothing is wrong" footnote
 * and lives at the bottom so it never delays the start tap.
 */
export const StationStartGate: React.FC<StationStartGateProps> = ({
  occasion,
  serverOccasion,
  onOccasionChange,
  role,
  staffName,
  support,
  onStart,
  starting = false,
  pendingWrites = 0,
  className = '',
}) => (
  <div className={`mx-auto w-full max-w-md space-y-5 ${className}`}>
    <div className="rounded-2xl bg-surface-card p-6 text-center">
      <ScanLine className="mx-auto mb-4 h-10 w-10 text-brand-primary" aria-hidden="true" />
      <Heading level="h1" className="mb-1 text-2xl font-bold">
        Door check-in
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

    <fieldset className="rounded-2xl bg-surface-card p-5">
      <legend className="sr-only">Which day are you working?</legend>
      <p className="mb-3 text-sm font-semibold text-text-primary">Which day are you working?</p>
      <div className="space-y-2" role="radiogroup" aria-label="Day">
        {DOOR_OCCASIONS.map((option, index) => {
          const selected = option === occasion;
          const handleKeyDown = (event: React.KeyboardEvent) => {
            const { key } = event;
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return;
            event.preventDefault();
            const nextIndex =
              key === 'ArrowLeft' || key === 'ArrowUp'
                ? (index - 1 + DOOR_OCCASIONS.length) % DOOR_OCCASIONS.length
                : (index + 1) % DOOR_OCCASIONS.length;
            const nextOption = DOOR_OCCASIONS[nextIndex];
            onOccasionChange(nextOption);
            const nextButton = document.querySelector<HTMLButtonElement>(
              `[data-occasion="${nextOption}"]`
            );
            nextButton?.focus();
          };
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              data-occasion={option}
              tabIndex={selected ? 0 : -1}
              onClick={() => onOccasionChange(option)}
              onKeyDown={handleKeyDown}
              className={`block w-full min-h-16 rounded-xl border-2 px-4 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                selected
                  ? 'border-brand-primary bg-brand-primary/10'
                  : 'border-divider bg-surface-elevated hover:border-text-muted'
              }`}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-base font-semibold text-text-primary">
                  {DOOR_OCCASION_LABELS[option]}
                </span>
                <span className="shrink-0 text-xs text-text-muted">{DOOR_OCCASION_DATE_LABELS[option]}</span>
              </span>
              {/* What the station DOES on this day — the label alone does not say
                  that the warm-up meetup never checks anyone in. */}
              <span className="mt-0.5 block text-sm text-text-tertiary">
                {DOOR_OCCASION_TASKS[option]}
              </span>
            </button>
          );
        })}
      </div>
      {occasion !== serverOccasion ? (
        <p className="mt-3 flex items-start gap-2 text-xs">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
          <span className="font-medium text-warning">
            This is not the day the server thinks it is — pick it only if you really are
            processing {DOOR_OCCASION_LABELS[occasion]} arrivals.
          </span>
        </p>
      ) : null}
    </fieldset>

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
      whole shift. Everything you record is filed under the day picked above — you can change
      it later from the bar at the top.
    </p>

    {/* A footnote, not a warning: nothing is wrong, so it must not sit between
        the volunteer and the start button. */}
    {support?.camera && !support.nativeDetector ? (
      <div className="flex items-start gap-3 rounded-xl border border-info/40 bg-info/10 px-4 py-3">
        <Cpu className="mt-0.5 h-5 w-5 shrink-0 text-info" aria-hidden="true" />
        <p className="text-sm text-text-secondary">
          {/* Safari has no BarcodeDetector, so this is every iPhone. Saying so
              once beats a volunteer wondering why the first scan took a beat. */}
          Good to know: this phone uses the built-in decoder, so the first scan takes a moment
          longer while it loads. Everything after is the same speed.
        </p>
      </div>
    ) : null}
  </div>
);
