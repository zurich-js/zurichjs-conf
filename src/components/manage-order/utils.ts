/**
 * Manage Order Utility Functions
 */

/**
 * Extract a human-readable error message from a failed API response.
 * Gateways can answer with non-JSON bodies (HTML 502/504 pages), so a bare
 * `response.json()` would itself throw and surface a parse error to the user.
 */
export async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
      return data.error;
    }
  } catch {
    // Non-JSON body — fall through to the fallback
  }
  return response.statusText ? `${fallback} (${response.status} ${response.statusText})` : fallback;
}

export function formatAmount(amount: number, currency: string): string {
  const formatted = (amount / 100).toFixed(2);
  const currencySymbol = currency.toUpperCase() === 'CHF' ? 'CHF' : '€';
  return `${currencySymbol} ${formatted}`;
}

export function formatDate(dateString: string): string {
  // Pinned to the venue timezone so server-rendered HTML and client hydration
  // agree regardless of where the server or visitor is located
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
  });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'text-green-700';
    case 'pending':
      return 'text-yellow-700';
    case 'cancelled':
      return 'text-red-700';
    case 'refunded':
      return 'text-gray-700';
    default:
      return 'text-gray-700';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'Confirmed';
    case 'pending':
      return 'Pending';
    case 'cancelled':
      return 'Cancelled';
    case 'refunded':
      return 'Refunded';
    default:
      return status;
  }
}
