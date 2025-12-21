/**
 * Status Badge Component
 * Displays submission status with appropriate styling
 */

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-black',
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-purple-100 text-purple-800',
  shortlisted: 'bg-indigo-100 text-indigo-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  waitlisted: 'bg-orange-100 text-orange-800',
  withdrawn: 'bg-gray-100 text-black',
};

const STATUS_LABELS: Record<string, string> = {
  under_review: 'In Review',
  shortlisted: 'Shortlisted',
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-all duration-200 ${
        STATUS_STYLES[status] || STATUS_STYLES.draft
      }`}
      role="status"
    >
      {STATUS_LABELS[status] || status.replace('_', ' ')}
    </span>
  );
}
