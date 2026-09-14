import { Star } from 'lucide-react';
import type { SessionFeedbackSummary } from '@/lib/types/session-feedback';
import { STAR_SHADES } from './DistributionBar';

export interface RatingBreakdownProps {
  distribution: SessionFeedbackSummary['distribution'];
  total: number;
}

/** Five-to-one star histogram with counts and shares, for the drill-down view. */
export function RatingBreakdown({ distribution, total }: RatingBreakdownProps): React.JSX.Element {
  const rows = [5, 4, 3, 2, 1];

  return (
    <ul className="space-y-1.5">
      {rows.map((stars) => {
        const count = distribution[stars - 1];
        const share = total === 0 ? 0 : (count / total) * 100;
        return (
          <li key={stars} className="flex items-center gap-3 text-xs">
            <span className="inline-flex w-10 shrink-0 items-center gap-1 tabular-nums text-gray-600">
              {stars}
              <Star className="w-3 h-3 fill-current text-amber-400" aria-hidden="true" />
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div className={`h-full ${STAR_SHADES[stars - 1]}`} style={{ width: `${share}%` }} />
            </div>
            <span className="w-20 shrink-0 text-right tabular-nums text-gray-500">
              {count}
              {total > 0 ? <span className="text-gray-400"> · {Math.round(share)}%</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
