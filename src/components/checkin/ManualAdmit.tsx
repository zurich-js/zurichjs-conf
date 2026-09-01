import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button, Textarea } from '@/components/atoms';

export interface ManualAdmitProps {
  /** Submitted with the admission and stored on the audit row. */
  onAdmit: (reason: string) => void;
  pending?: boolean;
  className?: string;
}

/** The database refuses a shorter reason, so the form does too — more kindly. */
const MIN_REASON = 3;
const MAX_REASON = 500;

/**
 * Admit someone the station could not scan.
 *
 * WHY THIS IS A SEPARATE ACTION AND NOT JUST A CHECK-IN
 * Reaching someone through the lookup desk means nobody verified a QR code. That
 * is a materially different fact about the admission and the audit trail records
 * it as `manual_admit`, not `checked_in` — otherwise a review weeks later cannot
 * distinguish a scanned arrival from a volunteer taking someone's word for it.
 * Only a door lead can do it, which is why the button appears for one role.
 *
 * WHY THE REASON IS MANDATORY
 * An admission with no reason is indistinguishable from a mistake when the log is
 * read later, and "blank badge" versus "insists they bought a ticket" are very
 * different entries. The database enforces this as well; this is the friendlier
 * of the two refusals.
 */
export const ManualAdmit: React.FC<ManualAdmitProps> = ({
  onAdmit,
  pending = false,
  className = '',
}) => {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();
  const ready = trimmed.length >= MIN_REASON;

  return (
    <section
      className={`rounded-2xl border border-warning/40 bg-warning/10 p-5 ${className}`}
      aria-label="Admit without a code"
    >
      <div className="mb-3 flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-text-primary">Admit without a code</p>
          <p className="mt-1 text-sm text-text-secondary">
            Recorded against your name with the reason below.
          </p>
        </div>
      </div>

      <label htmlFor="manual-admit-reason" className="sr-only">
        Why is this admission manual?
      </label>
      <Textarea
        id="manual-admit-reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Blank badge — bought this morning"
        rows={2}
        maxLength={MAX_REASON}
        fullWidth
      />

      <Button
        variant="primary"
        size="lg"
        className="mt-3 w-full"
        loading={pending}
        disabled={!ready || pending}
        onClick={() => onAdmit(trimmed)}
      >
        {ready ? 'Admit them' : 'Add a reason first'}
      </Button>
    </section>
  );
};
