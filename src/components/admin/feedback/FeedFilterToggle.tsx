import { ListFilter } from 'lucide-react';

export interface FeedFilterToggleProps {
  isActive: boolean;
  /** What the filter narrows the feed to — a session title or a speaker name */
  label: string;
  onToggle: () => void;
}

/**
 * Narrows the live feed to one rollup row. The row itself is clickable too, but
 * a `<tr>` can't take focus, so this button is how the filter is reached with
 * Tab and Enter.
 */
export function FeedFilterToggle({ isActive, label, onToggle }: FeedFilterToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={`cursor-pointer rounded-md p-1.5 transition-colors ${
        isActive ? 'bg-amber-100 text-amber-800' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
      }`}
    >
      <ListFilter className="w-4 h-4" aria-hidden="true" />
      <span className="sr-only">{isActive ? `Clear feed filter for ${label}` : `Filter feed to ${label}`}</span>
    </button>
  );
}
