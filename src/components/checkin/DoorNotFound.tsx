import React from 'react';
import { SearchX } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { DoorStateBanner } from './DoorStateBanner';

export interface DoorNotFoundProps {
  /** Whether this role may open the desk lookup. */
  canLookUp?: boolean;
  onOpenLookup?: () => void;
  onEscalate?: () => void;
  className?: string;
}

/**
 * Shown when a scanned code matches nothing.
 *
 * This is a routine outcome, not a failure: anyone who bought after the badge
 * print run has a blank badge with no machine-readable code, and any attendee can
 * present a QR from a different event. So the screen leads with the next action
 * rather than an apology, and never suggests issuing a new ticket — a refunded
 * attendee would be handed a free one.
 */
export const DoorNotFound: React.FC<DoorNotFoundProps> = ({
  canLookUp = false,
  onOpenLookup,
  onEscalate,
  className = '',
}) => (
  <section className={`space-y-4 ${className}`} aria-label="Code not recognised">
    <DoorStateBanner state="unknown" detail="This code is not in today's roster" />

    <div className="rounded-2xl bg-surface-card p-5">
      <div className="flex items-start gap-3">
        <SearchX className="mt-0.5 h-5 w-5 shrink-0 text-text-tertiary" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-text-primary">Find them by name instead</p>
          <p className="mt-1 text-sm text-text-tertiary">
            Blank badges have no code, so this is expected for anyone who bought recently.
          </p>
        </div>
      </div>
    </div>

    <div className="flex gap-3">
      {canLookUp ? (
        <Button variant="primary" size="lg" className="flex-1" onClick={onOpenLookup}>
          Look up by name
        </Button>
      ) : null}
      {onEscalate ? (
        <Button variant="dark" size="lg" className={canLookUp ? '' : 'flex-1'} onClick={onEscalate}>
          Get a lead
        </Button>
      ) : null}
    </div>
  </section>
);
