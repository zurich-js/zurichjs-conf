import { Star } from 'lucide-react';
import { ratingTone } from './format';

export interface StarRatingProps {
  rating: number;
  /** Tailwind size classes for each star — defaults to the compact feed size */
  className?: string;
}

/** Five small stars with `rating` of them filled. */
export function StarRating({ rating, className = 'w-3.5 h-3.5' }: StarRatingProps): React.JSX.Element {
  return (
    <span className={`inline-flex items-center gap-0.5 ${ratingTone(rating)}`} role="img" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((step) => (
        <Star key={step} className={`${className} ${step <= rating ? 'fill-current' : 'text-gray-300'}`} aria-hidden="true" />
      ))}
    </span>
  );
}
