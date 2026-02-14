/**
 * Shortlist Status Badge Component
 * Displays the shortlist intelligence status with appropriate styling
 */

import type { ShortlistStatus } from '@/lib/cfp/scoring';
import { SHORTLIST_STATUS_LABELS } from '@/lib/cfp/scoring';

const STATUS_STYLES: Record<ShortlistStatus, string> = {
  likely_shortlisted: 'bg-green-100 text-green-800',
  borderline: 'bg-yellow-100 text-yellow-800',
  needs_more_reviews: 'bg-orange-100 text-orange-800',
  likely_reject: 'bg-red-100 text-red-800',
};

interface ShortlistBadgeProps {
  status: ShortlistStatus;
  className?: string;
}

export function ShortlistBadge({ status, className = '' }: ShortlistBadgeProps) {
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${STATUS_STYLES[status]} ${className}`}
      role="status"
    >
      {SHORTLIST_STATUS_LABELS[status]}
    </span>
  );
}
