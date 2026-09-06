import React from 'react';
import { ListChecks, Search } from 'lucide-react';
import { Button } from '@/components/atoms/Button';

export interface StationQuickActionsProps {
  /** Hidden once the lookup is open — the button would only re-open it. */
  showLookup: boolean;
  showMyList: boolean;
  onOpenLookup: () => void;
  onOpenMyList: () => void;
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
  onOpenLookup,
  onOpenMyList,
  className = '',
}) => {
  if (!showLookup && !showMyList) return null;

  return (
    <div className={`grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 ${className}`}>
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
