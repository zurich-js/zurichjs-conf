import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { Input } from '@/components/atoms';
import { createDoorSearch, DOOR_SEARCH_MIN_LENGTH } from '@/lib/checkin/search';
import { formatDoorTime } from '@/lib/checkin/panel-state';
import type { DoorSearchableRecord } from '@/lib/checkin/roster-index';

export interface DeskLookupProps {
  records: readonly DoorSearchableRecord[];
  onSelect: (record: DoorSearchableRecord) => void;
  onClose: () => void;
  /** Whether this role may see email addresses. */
  showContact?: boolean;
  className?: string;
}

/**
 * Find someone by name when there is no code to scan.
 *
 * Not a fallback: the badge print run happens before sales close, so everyone
 * who buys after it has a blank badge and no machine-readable code at all. That
 * is a known slice of the audience and they are disproportionately the ones
 * arriving late.
 *
 * Searching is synchronous and against the roster already in memory, so results
 * appear as the volunteer types with no request and no debounce needed for cost
 * — the debounce here is purely to avoid re-rendering a list on every keystroke.
 */
export const DeskLookup: React.FC<DeskLookupProps> = ({
  records,
  onSelect,
  onClose,
  showContact = false,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Rebuilt only when the roster changes, not per keystroke: indexing 300 people
  // is a few milliseconds, and doing it per character would be felt.
  const search = useMemo(() => createDoorSearch(records), [records]);
  const hits = useMemo(() => search.query(query), [search, query]);

  useEffect(() => {
    // The volunteer opened this to type. Anything else costs a tap.
    inputRef.current?.focus();
  }, []);

  return (
    <section className={`space-y-3 ${className}`} aria-label="Find an attendee">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <Input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, company or email"
            // A phone would otherwise capitalise and autocorrect a surname into
            // a dictionary word.
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby="desk-lookup-hint"
            className="pl-10"
            fullWidth
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-card text-text-muted transition-colors hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Close lookup</span>
        </button>
      </div>

      <p id="desk-lookup-hint" className="text-xs text-text-muted">
        Accents and spelling are forgiving — type it as you heard it.
      </p>

      {/* Announced politely: a result count changing under the volunteer's
          fingers must not interrupt what they are typing. */}
      <div aria-live="polite" className="space-y-2">
        {query.trim().length < DOOR_SEARCH_MIN_LENGTH ? (
          <p className="py-6 text-center text-sm text-text-muted">
            Type at least {DOOR_SEARCH_MIN_LENGTH} letters.
          </p>
        ) : hits.length === 0 ? (
          <div className="rounded-xl bg-surface-card px-4 py-5 text-center">
            <p className="text-sm text-text-primary">Nobody matches that</p>
            <p className="mt-1 text-sm text-text-tertiary">
              Try their surname alone, or the company they came with.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {hits.map(({ record }) => (
              <li key={record.subjectId}>
                <button
                  type="button"
                  onClick={() => onSelect(record)}
                  className="flex w-full items-center gap-3 rounded-xl bg-surface-card px-4 py-3 text-left transition-colors hover:bg-surface-card-hover focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-text-primary">
                      {[record.firstName, record.lastName].filter(Boolean).join(' ') ||
                        // An unnamed workshop seat: the buyer never filled in who
                        // was coming, so the company is all there is to show.
                        record.company ||
                        'Unnamed seat'}
                    </span>
                    <span className="block truncate text-sm text-text-tertiary">
                      {[
                        record.company,
                        showContact ? record.email : null,
                        record.subjectKind === 'workshop_registration' ? 'Workshop only' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>

                  {/* The time, not a tick: "already checked in" with no time
                      invites the volunteer to assume a glitch and admit again. */}
                  {record.checkedInAt ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-warning/15 px-2 py-1 text-xs font-medium text-warning">
                      <Check className="h-3 w-3" aria-hidden="true" />
                      {formatDoorTime(record.checkedInAt)}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
