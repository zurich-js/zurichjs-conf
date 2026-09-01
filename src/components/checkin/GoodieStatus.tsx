import React, { useState } from 'react';
import { Gift, PackageCheck } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { TSHIRT_SIZES } from '@/lib/validations/cfp';

/** What actually went over the counter. `null` size = that item was NOT handed. */
export interface GoodieHandoverPayload {
  tshirtSize: string | null;
  hoodieSize: string | null;
  /** Composed summary of anything missing, plus whatever the volunteer typed. */
  note?: string;
}

export interface GoodieStatusProps {
  /** Entitlement follows the conference ticket — false for a workshop-only attendee. */
  entitled: boolean;
  handedAt: string | null;
  /** Note recorded when only part of the entitlement was handed over. */
  note?: string | null;
  /** Preferred sizes from the attendee's apparel form; the defaults, not the truth. */
  preferredTshirtSize?: string | null;
  preferredHoodieSize?: string | null;
  /** Hoodies are part of the VIP package only. */
  isVip?: boolean;
  /** Whether this role may record a handover. */
  canHandOver?: boolean;
  pending?: boolean;
  onHandOver?: (payload: GoodieHandoverPayload) => void;
  className?: string;
}

interface ItemRowProps {
  label: string;
  given: boolean;
  onGivenChange: (given: boolean) => void;
  size: string;
  onSizeChange: (size: string) => void;
}

/** One physical item: given or not, and in which size when given. */
const ItemRow: React.FC<ItemRowProps> = ({ label, given, onGivenChange, size, onSizeChange }) => {
  const selectId = `goodie-size-${label.toLowerCase().replace(/\s/g, '-')}`;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-card px-3 py-2.5">
      <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={given}
          onChange={(event) => onGivenChange(event.target.checked)}
          className="h-5 w-5 shrink-0 accent-brand-primary"
        />
        <span className="text-sm font-medium text-text-primary">{label}</span>
      </label>
      {given ? (
        <label className="flex items-center gap-2">
          <span className="sr-only" id={`${selectId}-label`}>
            {label} size handed over
          </span>
          <select
            id={selectId}
            aria-labelledby={`${selectId}-label`}
            value={size}
            onChange={(event) => onSizeChange(event.target.value)}
            className="min-h-11 rounded-lg bg-surface-elevated px-3 text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="" disabled>
              Size?
            </option>
            {TSHIRT_SIZES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span className="text-xs font-medium text-warning">Not handed</span>
      )}
    </div>
  );
};

/**
 * Goodie-bag state and the action to record one.
 *
 * WHY PER ITEM AND NOT ONE BUTTON
 * "Handed over" alone cannot answer the two questions that actually come up at
 * the swag table: which size did they really take (the preference form is a
 * wish, the pile in front of the volunteer is reality), and what was missing
 * when a size ran out. So the handover confirms each item — actual size, or
 * explicitly not handed — and anything missing lands in the note the next
 * volunteer sees on a re-scan.
 *
 * A workshop-only attendee is not entitled to a bag, and that renders as a plain
 * informational row rather than an error: they are a legitimate attendee.
 */
export const GoodieStatus: React.FC<GoodieStatusProps> = ({
  entitled,
  handedAt,
  note,
  preferredTshirtSize = null,
  preferredHoodieSize = null,
  isVip = false,
  canHandOver = false,
  pending = false,
  onHandOver,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [tshirtGiven, setTshirtGiven] = useState(true);
  const [tshirtSize, setTshirtSize] = useState(normalizeSize(preferredTshirtSize));
  const [hoodieGiven, setHoodieGiven] = useState(isVip);
  const [hoodieSize, setHoodieSize] = useState(normalizeSize(preferredHoodieSize));
  const [extraNote, setExtraNote] = useState('');

  if (!entitled) {
    return (
      <div
        className={`flex items-center gap-3 rounded-xl bg-surface-elevated px-4 py-3 ${className}`}
      >
        <Gift className="h-5 w-5 shrink-0 text-text-tertiary" aria-hidden="true" />
        <p className="text-sm text-text-tertiary">No goodie bag — workshop only</p>
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
            <p className="text-sm font-semibold text-text-primary">Goodies handed over</p>
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

  if (!canHandOver || !onHandOver) {
    return (
      <div className={`flex items-center gap-3 rounded-xl bg-surface-elevated px-4 py-3 ${className}`}>
        <Gift className="h-5 w-5 shrink-0 text-brand-yellow-main" aria-hidden="true" />
        <p className="text-sm font-semibold text-text-primary">Goodies not yet handed over</p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className={`rounded-xl bg-surface-elevated px-4 py-3 ${className}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Gift className="h-5 w-5 shrink-0 text-brand-yellow-main" aria-hidden="true" />
            <p className="text-sm font-semibold text-text-primary">
              Goodies not yet handed over
            </p>
          </div>
          <Button size="sm" variant="primary" onClick={() => setOpen(true)}>
            Hand over
          </Button>
        </div>
      </div>
    );
  }

  const items: string[] = [];
  if (tshirtGiven) items.push(tshirtSize);
  if (isVip && hoodieGiven) items.push(hoodieSize);
  const sizesMissing = items.some((size) => size === '');
  const nothingGiven = !tshirtGiven && (!isVip || !hoodieGiven);

  const confirm = () => {
    onHandOver({
      tshirtSize: tshirtGiven ? tshirtSize : null,
      hoodieSize: isVip && hoodieGiven ? hoodieSize : null,
      note: composeNote({ tshirtGiven, tshirtSize, hoodieGiven, hoodieSize, isVip, extraNote }),
    });
    setOpen(false);
  };

  return (
    <section
      className={`rounded-xl bg-surface-elevated p-4 ${className}`}
      aria-label="Record goodie handover"
    >
      <div className="mb-1 flex items-center gap-3">
        <Gift className="h-5 w-5 shrink-0 text-brand-yellow-main" aria-hidden="true" />
        <p className="text-sm font-semibold text-text-primary">Hand over the goodies</p>
      </div>
      <p className="mb-3 text-xs text-text-tertiary">
        Confirm the size that actually goes over the counter — sizes below start from what
        they asked for. Untick anything you cannot hand over (out of stock, will collect
        later) and it is saved on their record for the follow-up.
      </p>

      <div className="space-y-2">
        <ItemRow
          label="T-shirt"
          given={tshirtGiven}
          onGivenChange={setTshirtGiven}
          size={tshirtSize}
          onSizeChange={setTshirtSize}
        />
        {isVip ? (
          <ItemRow
            label="Hoodie (VIP)"
            given={hoodieGiven}
            onGivenChange={setHoodieGiven}
            size={hoodieSize}
            onSizeChange={setHoodieSize}
          />
        ) : null}
      </div>

      {!tshirtGiven || (isVip && !hoodieGiven) ? (
        <div className="mt-2">
          <label htmlFor="goodie-missing-note" className="sr-only">
            Why was something not handed over?
          </label>
          <input
            id="goodie-missing-note"
            type="text"
            value={extraNote}
            onChange={(event) => setExtraNote(event.target.value)}
            maxLength={160}
            placeholder="Why not? e.g. M out of stock — collect at 14:00"
            className="min-h-11 w-full rounded-lg bg-surface-card px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          loading={pending}
          disabled={pending || sizesMissing || nothingGiven}
          onClick={confirm}
        >
          {nothingGiven
            ? 'Nothing to record'
            : sizesMissing
              ? 'Pick the sizes first'
              : 'Confirm handover'}
        </Button>
        <Button variant="dark" size="lg" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </section>
  );
};

/** A preference is a default only when it matches a real size on the table. */
function normalizeSize(preferred: string | null): string {
  const upper = preferred?.toUpperCase().trim() ?? '';
  return (TSHIRT_SIZES as readonly string[]).includes(upper) ? upper : '';
}

interface ComposeNoteArgs {
  tshirtGiven: boolean;
  tshirtSize: string;
  hoodieGiven: boolean;
  hoodieSize: string;
  isVip: boolean;
  extraNote: string;
}

/**
 * The human-readable summary stored in goodie_note, so a re-scan shows what
 * happened without decoding metadata. Only written when something deviates —
 * a full handover in the preferred sizes needs no note.
 */
function composeNote({
  tshirtGiven,
  tshirtSize,
  hoodieGiven,
  hoodieSize,
  isVip,
  extraNote,
}: ComposeNoteArgs): string | undefined {
  const parts: string[] = [];
  parts.push(tshirtGiven ? `T-shirt ${tshirtSize} handed` : 'T-shirt NOT handed');
  if (isVip) {
    parts.push(hoodieGiven ? `Hoodie ${hoodieSize} handed` : 'Hoodie NOT handed');
  }
  const trimmedExtra = extraNote.trim();
  if (trimmedExtra) parts.push(trimmedExtra);

  const anythingMissing = !tshirtGiven || (isVip && !hoodieGiven);
  if (!anythingMissing && !trimmedExtra) {
    // Everything went over in one go: the sizes live on the audit row's
    // metadata, and a noise note would bury real ones.
    return undefined;
  }
  return parts.join(' · ').slice(0, 280);
}

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
