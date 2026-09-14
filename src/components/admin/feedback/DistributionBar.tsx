import type { SessionFeedbackSummary } from '@/lib/types/session-feedback';

export interface DistributionBarProps {
  distribution: SessionFeedbackSummary['distribution'];
  total: number;
}

/** Tailwind background per star level, one star (index 0) through five. */
export const STAR_SHADES = ['bg-red-400', 'bg-orange-300', 'bg-amber-300', 'bg-lime-400', 'bg-green-500'] as const;

/** Screen-reader/tooltip text for a star distribution. */
export function distributionLabel(distribution: SessionFeedbackSummary['distribution']): string {
  return distribution.map((count, index) => `${count}× ${index + 1} star`).join(', ');
}

/** Stacked bar of one-to-five-star counts; a flat grey track when there are none. */
export function DistributionBar({ distribution, total }: DistributionBarProps): React.JSX.Element {
  if (total === 0) {
    return <div className="h-2 w-full rounded-full bg-gray-100" aria-hidden="true" />;
  }
  const label = distributionLabel(distribution);
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100" role="img" aria-label={label} title={label}>
      {distribution.map((count, index) =>
        count > 0 ? (
          <div key={index} className={STAR_SHADES[index]} style={{ width: `${(count / total) * 100}%` }} />
        ) : null
      )}
    </div>
  );
}
