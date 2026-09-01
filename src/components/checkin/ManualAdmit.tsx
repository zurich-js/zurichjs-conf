import React, { useState } from 'react';
import { ChevronDown, ShieldAlert } from 'lucide-react';
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
 * The reasons that actually happen at a door, one tap each. Free text remains
 * for everything else — but a queue moves faster when the common cases are
 * buttons, and canned phrasing makes the log greppable afterwards.
 */
const COMMON_REASONS = [
  'Blank badge — bought after the print run',
  'QR damaged / will not scan',
  'Ticket is on someone else’s phone',
  'Verified against the ticket email at the desk',
] as const;

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
 * WHY IT STARTS COLLAPSED
 * This sits directly under a person found by name, and most of them just need
 * their code re-scanned or their colleague fetched. Expanding is the deliberate
 * step; the collapsed line says exactly what the action is FOR so a lead never
 * has to guess whether this is the right tool.
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
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();
  const ready = trimmed.length >= MIN_REASON;

  return (
    <section
      className={`rounded-2xl border border-warning/40 bg-warning/10 ${className}`}
      aria-label="Admit without a code"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 rounded-2xl p-5 text-left focus:outline-none focus:ring-2 focus:ring-brand-primary"
      >
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-text-primary">
            Admit without a code
          </span>
          <span className="mt-1 block text-sm text-text-secondary">
            For someone found by name whose badge or phone has no scannable QR — a blank
            badge, a damaged print, a dead phone.
          </span>
        </span>
        <ChevronDown
          className={`mt-0.5 h-5 w-5 shrink-0 text-text-tertiary transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="px-5 pb-5">
          <p className="mb-3 text-sm text-text-secondary">
            This records a <span className="font-medium text-text-primary">manual admission</span>{' '}
            against your name — separate from a scan, because nobody verified a code. Say
            why, so the entry makes sense when the log is read later:
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            {COMMON_REASONS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setReason(preset)}
                aria-pressed={trimmed === preset}
                className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                  trimmed === preset
                    ? 'border-brand-primary bg-brand-primary/15 text-text-primary'
                    : 'border-divider bg-surface-card text-text-secondary hover:border-text-muted'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <label htmlFor="manual-admit-reason" className="sr-only">
            Why is this admission manual?
          </label>
          <Textarea
            id="manual-admit-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="…or type your own reason"
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
        </div>
      ) : null}
    </section>
  );
};
