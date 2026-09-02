import React from 'react';
import { ArrowLeft, CloudOff, LogOut, RefreshCw, Users } from 'lucide-react';
import { DOOR_OCCASIONS, DOOR_OCCASION_LABELS, DOOR_ROLE_LABELS } from '@/lib/types/checkin';
import type { DoorOccasion, DoorRole } from '@/lib/types/checkin';
import { formatDoorTime } from '@/lib/checkin/panel-state';

export interface StationBarProps {
  /** The day being worked. Changing it re-keys the roster and future writes. */
  occasion: DoorOccasion;
  onOccasionChange?: (occasion: DoorOccasion) => void;
  role: DoorRole;
  /** Attendees held in memory, so a volunteer can see the roster really loaded. */
  rosterSize: number | null;
  /** When the held roster was built on the server. */
  generatedAt: string | null;
  /** Writes not yet acknowledged by the server. */
  pendingWrites: number;
  onRefreshRoster?: () => void;
  refreshing?: boolean;
  /** Back to the start screen — ends scanning WITHOUT signing out. */
  onExit?: () => void;
  onSignOut?: () => void;
  className?: string;
}

/**
 * One compact line of state, above the camera.
 *
 * Everything here answers a question a volunteer asks out loud during a shift:
 * which day am I working, what am I allowed to do, did the roster actually
 * load, and is anything stuck. Nothing here is decoration — the screen is small
 * and the panel below it is what matters.
 *
 * The day is a control, not a label: badges are picked up and workshops
 * rehearsed on other days, so a volunteer must be able to switch without
 * ending the shift. Writes taken before the switch keep the day they were
 * taken for — the queue stamps each entry at enqueue.
 *
 * The pending-writes count is the honest part of an optimistic UI. The station
 * tells a volunteer a check-in worked before the server has confirmed it, so it
 * owes them a visible count of what has not landed.
 */
export const StationBar: React.FC<StationBarProps> = ({
  occasion,
  onOccasionChange,
  role,
  rosterSize,
  generatedAt,
  pendingWrites,
  onRefreshRoster,
  refreshing = false,
  onExit,
  onSignOut,
  className = '',
}) => (
  <header
    className={`flex flex-wrap items-center gap-x-2 gap-y-2 rounded-2xl bg-surface-card px-3 py-3 ${className}`}
  >
    {onExit ? (
      <button
        type="button"
        onClick={onExit}
        // The way OUT of the scanner that is not sign-out: back to the start
        // screen, keeping the session and any queued writes.
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-surface-elevated hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Back to the start screen</span>
      </button>
    ) : null}

    <div className="min-w-0 flex-1">
      {onOccasionChange ? (
        <label className="block">
          <span className="sr-only">Day being worked</span>
          <select
            value={occasion}
            onChange={(event) => onOccasionChange(event.target.value as DoorOccasion)}
            className="max-w-full cursor-pointer rounded-lg bg-surface-elevated px-2 py-1 text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            {DOOR_OCCASIONS.map((option) => (
              <option key={option} value={option}>
                {DOOR_OCCASION_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="truncate text-sm font-semibold text-text-primary">
          {DOOR_OCCASION_LABELS[occasion]}
        </p>
      )}
      <p className="truncate text-xs text-text-muted">
        {DOOR_ROLE_LABELS[role]}
        {rosterSize !== null ? ` · ${rosterSize} in memory` : ''}
        {generatedAt ? ` · loaded ${formatDoorTime(generatedAt)}` : ''}
      </p>
    </div>

    {pendingWrites > 0 ? (
      <span
        className="flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning"
        // Not assertive: a volunteer must not be interrupted mid-scan by a
        // number that will fix itself in a second.
        role="status"
      >
        <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
        {pendingWrites} unsent
      </span>
    ) : null}

    {rosterSize === null ? (
      <span className="flex items-center gap-1.5 text-xs text-text-muted">
        <Users className="h-3.5 w-3.5" aria-hidden="true" />
        Loading roster…
      </span>
    ) : null}

    {onRefreshRoster ? (
      <button
        type="button"
        onClick={onRefreshRoster}
        // 44px minimum: this sits next to sign-out and a mis-tap during a queue
        // would end the shift.
        className="flex h-11 w-11 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-surface-elevated hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
      >
        <RefreshCw
          className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />
        <span className="sr-only">Reload the roster</span>
      </button>
    ) : null}

    {onSignOut ? (
      <button
        type="button"
        onClick={onSignOut}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-surface-elevated hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Sign out</span>
      </button>
    ) : null}
  </header>
);
