/**
 * Shared Admin Status Badge Component
 * Unified status badge for consistent display across admin sections
 */

export type BadgeVariant =
  | 'default'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'purple'
  | 'indigo'
  | 'orange';

export type BadgeSize = 'sm' | 'md';

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-800',
  info: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  purple: 'bg-purple-100 text-purple-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  orange: 'bg-orange-100 text-orange-800',
};

const SIZE_STYLES: Record<BadgeSize, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
};

export interface AdminStatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

export function AdminStatusBadge({
  label,
  variant = 'default',
  size = 'md',
  className = '',
}: AdminStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${className}`}
      role="status"
    >
      {label}
    </span>
  );
}

/**
 * Helper to map common status strings to badge variants
 */
export function getStatusVariant(status: string): BadgeVariant {
  const statusLower = status.toLowerCase();
  
  if (['confirmed', 'accepted', 'paid', 'active', 'approved', 'completed'].includes(statusLower)) {
    return 'success';
  }
  if (['pending', 'draft', 'pending_details', 'pending_payment', 'sent'].includes(statusLower)) {
    return 'warning';
  }
  if (['rejected', 'cancelled', 'canceled', 'refunded', 'failed', 'expired'].includes(statusLower)) {
    return 'error';
  }
  if (['submitted', 'new', 'info'].includes(statusLower)) {
    return 'info';
  }
  if (['under_review', 'in_review', 'processing'].includes(statusLower)) {
    return 'purple';
  }
  if (['shortlisted', 'waitlisted'].includes(statusLower)) {
    return 'indigo';
  }
  if (['invoiced', 'invoice_sent'].includes(statusLower)) {
    return 'orange';
  }
  
  return 'default';
}

/**
 * Helper to format status strings for display
 */
export function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
