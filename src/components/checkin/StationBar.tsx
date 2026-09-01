import React from 'react';
import { CloudOff, LogOut, RefreshCw, Users } from 'lucide-react';
import { DOOR_OCCASION_LABELS, DOOR_ROLE_LABELS } from '@/lib/types/checkin';
import type { DoorOccasion, DoorRole } from '@/lib/types/checkin';
import { formatDoorTime } from '@/lib/checkin/panel-state';

export interface StationBarProps {
  occasion: DoorOccasion;
  role: DoorRole;
  station: string;
  /** Attendees held in memory, so a volunteer can see the roster really loaded. */
  rosterSize: number | null;
  /** When the held roster was built on the server. */
  generatedAt: string | null;
  /** Writes not yet acknowledged by the server. */
  pendingWrites: number;
  onRefreshRoster?: () => void;
  refreshing?: boolean;
  onSignOut?: () => void;
  className?: string;
}

/**
 * One compact line of state, above the camera.
 *
 * Everything here answers a question a volunteer asks out loud during a shift:
 * which day is this, what am I allowed to do, which door am I, did the roster
 * actually load, and is anything stuck. Nothing here is decoration — the screen
 * is small and the panel below it is what matters.
 *
 * The pending-writes count is the honest part of an optimistic UI. The station
 * tells a volunteer a check-in worked before the server has confirmed it, so it
 * owes them a visible count of what has not landed.
 */
export const StationBar: React.FC<StationBarProps> = ({
  occasion,
  role,
  station,
  rosterSize,
  generatedAt,
  pendingWrites,
  onRefreshRoster,
  refreshing = false,
  onSignOut,
  className = '',
}) => (
  <header
    className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-surface-card px-4 py-3 ${className}`}
  >
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-text-primary">
        {DOOR_OCCASION_LABELS[occasion]}
        {station ? ` · ${station}` : ''}
      </p>
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
