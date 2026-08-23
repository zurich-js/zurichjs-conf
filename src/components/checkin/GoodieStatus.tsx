import React from 'react';
import { Gift, PackageCheck } from 'lucide-react';
import { Button } from '@/components/atoms/Button';

export interface GoodieStatusProps {
  /** Entitlement follows the conference ticket — false for a workshop-only attendee. */
  entitled: boolean;
  handedAt: string | null;
  /** Note recorded when only part of the entitlement was handed over. */
  note?: string | null;
  /** Whether this role may record a handover. */
  canHandOver?: boolean;
  pending?: boolean;
  onHandOver?: () => void;
  className?: string;
}

/**
 * Goodie-bag state and the action to record one.
 *
 * Deliberately its own block with its own action, because handing over a t-shirt
 * happens at a different table from the scan — splitting the two removes roughly
 * 3.5 seconds from door service time, which is worth more than any code change.
 *
 * A workshop-only attendee is not entitled to a bag, and that renders as a plain
 * informational row rather than an error: they are a legitimate attendee.
 */
export const GoodieStatus: React.FC<GoodieStatusProps> = ({
  entitled,
  handedAt,
  note,
  canHandOver = false,
  pending = false,
  onHandOver,
  className = '',
}) => {
  if (!entitled) {
    return (
      <div
        className={`flex items-center gap-3 rounded-xl bg-surface-elevated px-4 py-3 ${className}`}
      >
        <Gift className="h-5 w-5 shrink-0 text-text-tertiary" aria-hidden="true" />
        <p className="text-sm text-text-tertiary">
          No goodie bag — workshop only
        </p>
      </div>
    );
  }

  if (handedAt) {
    return (
      <div
        className={`rounded-xl border border-success/40 bg-success/10 px-4 py-3 ${className}`}
      >
        <div className="flex items-center gap-3">
          <PackageCheck className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">Goodie bag handed over</p>
            <p className="text-xs text-text-tertiary">
              <time dateTime={handedAt}>{formatTime(handedAt)}</time>
            </p>
          </div>
        </div>
        {note ? (
          <p className="mt-2 border-t border-success/20 pt-2 text-xs text-text-secondary">
            {note}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`rounded-xl bg-surface-elevated px-4 py-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Gift className="h-5 w-5 shrink-0 text-brand-yellow-main" aria-hidden="true" />
          <p className="text-sm font-semibold text-text-primary">Goodie bag not yet handed over</p>
        </div>
        {canHandOver ? (
          <Button size="sm" variant="primary" onClick={onHandOver} loading={pending}>
            Hand over
          </Button>
        ) : null}
      </div>
    </div>
  );
};

/**
 * Time-only, in the venue's timezone.
 *
 * Fixed to Europe/Zurich rather than the device locale so two stations never
 * disagree about when someone arrived, and formatted in the browser so this is
 * only ever called from a mounted component.
 */
function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zurich',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
