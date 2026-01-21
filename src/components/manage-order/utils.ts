/**
 * Manage Order Utility Functions
 */

export function formatAmount(amount: number, currency: string): string {
  const formatted = (amount / 100).toFixed(2);
  const currencySymbol = currency.toUpperCase() === 'CHF' ? 'CHF' : '€';
  return `${currencySymbol} ${formatted}`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'text-success-light';
    case 'pending':
      return 'text-yellow-400';
    case 'cancelled':
      return 'text-red-400';
    case 'refunded':
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'confirmed':
      return '✓ Confirmed';
    case 'pending':
      return '⏳ Pending';
    case 'cancelled':
      return '✗ Cancelled';
    case 'refunded':
      return '↺ Refunded';
    default:
      return status;
  }
}
