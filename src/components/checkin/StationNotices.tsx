import React from 'react';
import { DoorNotice } from './DoorNotice';

export interface StationNoticesProps {
  /** The roster failed to load, so no scan can be resolved. */
  rosterFailed?: boolean;
  onRetryRoster?: () => void;
  /** Writes still queued, when a sign-out was refused because of them. */
  blockedSignOutCount?: number | null;
  onDismissSignOutBlock?: () => void;
  /** Writes the server refused outright, or that ran out of attempts. */
  failedWriteCount?: number;
  onDismissFailures?: () => void;
  className?: string;
}

/**
 * Everything the station has to tell a volunteer that is not about the attendee
 * in front of them.
 *
 * Grouped so it renders in a fixed order regardless of what happens when: a
 * roster failure outranks a stuck queue, because without a roster nothing else
 * on the screen means anything.
 */
export const StationNotices: React.FC<StationNoticesProps> = ({
  rosterFailed = false,
  onRetryRoster,
  blockedSignOutCount = null,
  onDismissSignOutBlock,
  failedWriteCount = 0,
  onDismissFailures,
  className = '',
}) => {
  if (!rosterFailed && blockedSignOutCount === null && failedWriteCount === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {rosterFailed ? (
        <DoorNotice
          tone="error"
          title="The roster did not load"
          actionLabel="Try again"
          onAction={onRetryRoster}
        >
          Scans cannot be resolved without it.
        </DoorNotice>
      ) : null}

      {failedWriteCount > 0 ? (
        <DoorNotice
          tone="error"
          title={`${failedWriteCount} check-in${
            failedWriteCount === 1 ? '' : 's'
          } could not be saved`}
          actionLabel="Dismiss"
          onAction={onDismissFailures}
        >
          Tell a lead. Anyone affected needs admitting again — the record did not stick.
        </DoorNotice>
      ) : null}

      {blockedSignOutCount !== null ? (
        <DoorNotice
          tone="warning"
          title={`Still ${blockedSignOutCount} unsent`}
          actionLabel="Dismiss"
          onAction={onDismissSignOutBlock}
        >
          Signing out now would lose them. Stay on this page until the count reaches zero — it
          retries by itself.
        </DoorNotice>
      ) : null}
    </div>
  );
};
