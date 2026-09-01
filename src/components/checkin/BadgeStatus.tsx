import React from 'react';
import { IdCard } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { formatDoorTime } from '@/lib/checkin/panel-state';

export interface BadgeStatusProps {
  pickedUpAt: string | null;
  /** Whether this role may record a pickup (every door role can). */
  canHandOver?: boolean;
  pending?: boolean;
  onHandOver?: () => void;
  className?: string;
}

/**
 * The physical badge, as its own row.
 *
 * Badges can be collected EARLY — on the community day before the workshops —
 * and picking one up must not consume the next morning's check-in. So the badge
 * is a separate fact with a separate button, and the row is the answer to the
 * question the pre-event desk actually asks: "did this person already take
 * their badge?"
 */
export const BadgeStatus: React.FC<BadgeStatusProps> = ({
  pickedUpAt,
  canHandOver = false,
  pending = false,
  onHandOver,
  className = '',
}) => {
  if (pickedUpAt) {
    return (
      <div
        className={`flex items-center gap-3 rounded-xl border border-success/40 bg-success/10 px-4 py-3 ${className}`}
      >
        <IdCard className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        <p className="text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">Badge picked up</span>{' '}
          <time dateTime={pickedUpAt}>at {formatDoorTime(pickedUpAt)}</time>
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl bg-surface-elevated px-4 py-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IdCard className="h-5 w-5 shrink-0 text-text-tertiary" aria-hidden="true" />
          <p className="text-sm font-semibold text-text-primary">Badge not picked up yet</p>
        </div>
        {canHandOver && onHandOver ? (
          <Button size="sm" variant="dark" onClick={onHandOver} loading={pending}>
            Badge handed over
          </Button>
        ) : null}
      </div>
    </div>
  );
};
