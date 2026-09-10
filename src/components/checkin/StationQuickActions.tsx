import React from 'react';
import { GraduationCap, ListChecks, Search } from 'lucide-react';
import { Button } from '@/components/atoms/Button';

export interface StationQuickActionsProps {
  /** Hidden once the lookup is open — the button would only re-open it. */
  showLookup: boolean;
  showMyList: boolean;
  /** Workshop day only: the per-room attendee lists. */
  showWorkshops?: boolean;
  onOpenLookup: () => void;
  onOpenMyList: () => void;
  onOpenWorkshops?: () => void;
  className?: string;
}

/**
 * The two things a volunteer reaches for between scans.
 *
 * A two-up grid, not flex: equal halves at every width. Padding is tightened
 * and the grid drops to one column under 400px — at this type scale two pills
 * side by side do not fit a phone, and the second one used to hang past the
 * edge of the screen. Stacked full-width buttons are the better tap target
 * there anyway.
 */
export const StationQuickActions: React.FC<StationQuickActionsProps> = ({
  showLookup,
  showMyList,
  showWorkshops = false,
  onOpenLookup,
  onOpenMyList,
  onOpenWorkshops,
  className = '',
}) => {
  const workshops = showWorkshops && onOpenWorkshops !== undefined;
  if (!showLookup && !showMyList && !workshops) return null;

  return (
    <div className={`grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 ${className}`}>
      {/* Full width on its own row: on workshop day the room list is the
          alternative to scanning, not a side tool, so it gets the wide target. */}
      {workshops ? (
        <Button
          variant="dark"
          size="md"
          className="min-h-12 whitespace-nowrap px-3! text-sm min-[400px]:col-span-2"
          onClick={onOpenWorkshops}
        >
          <GraduationCap className="h-4 w-4 shrink-0" aria-hidden="true" />
          Workshop lists
        </Button>
      ) : null}

      {/* Always reachable, not only after a failed scan: a lead working the
          problem desk searches for people who never got as far as a badge. */}
      {showLookup ? (
        <Button
          variant="dark"
          size="md"
          className="min-h-12 whitespace-nowrap px-3! text-sm"
          onClick={onOpenLookup}
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          Find by name
        </Button>
      ) : null}

      {showMyList ? (
        <Button
          variant="dark"
          size="md"
          className="min-h-12 whitespace-nowrap px-3! text-sm"
          onClick={onOpenMyList}
        >
          <ListChecks className="h-4 w-4 shrink-0" aria-hidden="true" />
          My check-ins
        </Button>
      ) : null}
    </div>
  );
};
