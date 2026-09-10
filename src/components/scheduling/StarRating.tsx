import { useId, useState, type KeyboardEvent } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StarRatingProps {
  /** Selected rating, 1–5, or null when nothing is picked yet */
  value: number | null;
  onChange?: (rating: number) => void;
  /** Read-only display, e.g. after a submission */
  readOnly?: boolean;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Great', 'Excellent'] as const;

/**
 * Five-star picker. Behaves as a radio group: one tab stop, arrow keys move
 * the selection, Enter/Space confirm. Hover previews the value on pointer
 * devices without committing it.
 */
export function StarRating({ value, onChange, readOnly = false, label = 'Rating', size = 'md', className }: StarRatingProps) {
  const groupId = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? value ?? 0;
  const iconSize = size === 'sm' ? 'size-5' : 'size-7';

  if (readOnly) {
    return (
      <div className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${label}: ${value ?? 0} out of 5`}>
        {RATING_LABELS.map((name, index) => (
          <Star
            key={name}
            aria-hidden="true"
            className={cn(iconSize, (value ?? 0) > index ? 'fill-brand-black text-brand-black' : 'text-brand-gray-medium')}
          />
        ))}
      </div>
    );
  }

  const select = (rating: number) => {
    onChange?.(rating);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(index + 2, 5);
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(index, 1);
    if (event.key === 'Home') next = 1;
    if (event.key === 'End') next = 5;
    if (next === null) return;
    event.preventDefault();
    select(next);
    const target = event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-rating="${next}"]`);
    target?.focus();
  };

  // Roving tabindex: the selected star (or the first one) is the single tab stop.
  const focusable = value ?? 1;

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex items-center gap-0.5', className)}
      onMouseLeave={() => setHovered(null)}
    >
      {RATING_LABELS.map((name, index) => {
        const rating = index + 1;
        const filled = shown >= rating;
        return (
          <button
            key={name}
            type="button"
            role="radio"
            id={`${groupId}-${rating}`}
            data-rating={rating}
            aria-checked={value === rating}
            aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'} – ${name}`}
            tabIndex={focusable === rating ? 0 : -1}
            onClick={() => select(rating)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onMouseEnter={() => setHovered(rating)}
            onFocus={() => setHovered(null)}
            className="cursor-pointer rounded-md p-0.5 text-brand-black transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
          >
            <Star aria-hidden="true" className={cn(iconSize, 'transition-colors', filled ? 'fill-brand-black' : 'fill-transparent')} />
          </button>
        );
      })}
    </div>
  );
}
