/**
 * CFP Travel Admin Component Types
 */

import type { CfpReimbursementStatus, CfpFlightStatus } from '@/lib/types/cfp';

export type { CfpReimbursementStatus, CfpFlightStatus };
export type TabType = 'overview' | 'speakers' | 'flights' | 'arrivals' | 'invoices';

export const STATUS_COLORS: Record<CfpReimbursementStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  paid: 'bg-blue-100 text-blue-800',
};

export const FLIGHT_STATUS_COLORS: Record<CfpFlightStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-green-100 text-green-700',
  checked_in: 'bg-blue-100 text-blue-700',
  boarding: 'bg-purple-100 text-purple-700',
  departed: 'bg-indigo-100 text-indigo-700',
  arrived: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  delayed: 'bg-orange-100 text-orange-700',
};

/**
 * Generate a FlightAware tracking URL from a flight number
 */
export function getFlightTrackingUrl(flightNumber: string | null, trackingUrl: string | null): string | null {
  if (trackingUrl) return trackingUrl;
  if (!flightNumber) return null;
  const cleaned = flightNumber.replace(/\s+/g, '');
  return `https://www.flightaware.com/live/flight/${cleaned}`;
}

/**
 * Calculate hotel nights from check-in/check-out dates
 */
export function calculateNights(checkIn: string | null, checkOut: string | null): number | null {
  if (!checkIn || !checkOut) return null;
  const nights = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
  );
  return Math.max(0, nights);
}
