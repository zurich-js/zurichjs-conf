import React, { useMemo } from 'react';
import { IdCard, RotateCcw } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { formatDoorTime } from '@/lib/checkin/panel-state';

export interface BadgeStatusProps {
  pickedUpAt: string | null;
  /** Whether this role may record a pickup (every door role can). */
  canHandOver?: boolean;
  /**
   * Hide the inline button even when the role could hand over — used when the
   * primary action bar already carries the handover, so one action is never
   * offered twice on one screen.
   */
  actionElsewhere?: boolean;
  pending?: boolean;
  onHandOver?: () => void;
  /** Take a mistaken handover back. Offered on the picked-up state only. */
  onUndo?: () => void;
  className?: string;
}

/**
 * The physical badge, as its own row.
 *
 * Badges can be collected EARLY — on the warm-up meetup before the workshops —
 * and picking one up must not consume any day's check-in. So the badge is a
 * separate fact with a separate button, and the row is the answer to the
 * question the pre-event desk actually asks: "did this person already take
 * their badge?"
 *
 * The undo sits on the picked-up state because that is where the mistake is
 * discovered: the row already says handed over while the badge is still on the
 * desk, or in the wrong person's hand.
 */
export const BadgeStatus: React.FC<BadgeStatusProps> = ({
  pickedUpAt,
  canHandOver = false,
  actionElsewhere = false,
  pending = false,
  onHandOver,
  onUndo,
  className = '',
}) => {
  const formattedPickupTime = useMemo(
    () => (pickedUpAt ? formatDoorTime(pickedUpAt) : null),
    [pickedUpAt]
  );

  if (pickedUpAt) {
    return (
      <div
        className={`rounded-xl border border-success/40 bg-success/10 px-4 py-3 ${className}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <IdCard className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">Badge picked up</span>{' '}
              <time dateTime={pickedUpAt}>at {formattedPickupTime}</time>
            </p>
          </div>
          {canHandOver && onUndo ? (
            <button
              type="button"
              onClick={onUndo}
              className="flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-medium text-text-muted underline-offset-2 hover:text-text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Undo
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl bg-surface-elevated px-4 py-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IdCard className="h-5 w-5 shrink-0 text-text-tertiary" aria-hidden="true" />
          <p className="text-sm font-semibold text-text-primary">Badge not picked up</p>
        </div>
        {canHandOver && !actionElsewhere && onHandOver ? (
          <Button
            size="sm"
            variant="dark"
            className="whitespace-nowrap"
            onClick={onHandOver}
            loading={pending}
          >
            Hand over
          </Button>
        ) : null}
      </div>
    </div>
  );
};
