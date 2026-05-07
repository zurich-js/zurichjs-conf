/**
 * CFP Travel Admin Component Types
 */

import type { CfpReimbursementStatus, CfpFlightStatus, CfpFlightDirection } from '@/lib/types/cfp';

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
 * Supported currencies for invoices, accommodation, and travel costs.
 * ISO 4217 codes covering common conference traveler home currencies.
 */
export const CURRENCIES: { code: string; label: string }[] = [
  { code: 'CHF', label: 'CHF — Swiss Franc' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'NZD', label: 'NZD — New Zealand Dollar' },
  { code: 'JPY', label: 'JPY — Japanese Yen' },
  { code: 'CNY', label: 'CNY — Chinese Yuan' },
  { code: 'HKD', label: 'HKD — Hong Kong Dollar' },
  { code: 'SGD', label: 'SGD — Singapore Dollar' },
  { code: 'KRW', label: 'KRW — South Korean Won' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'ILS', label: 'ILS — Israeli Shekel' },
  { code: 'ZAR', label: 'ZAR — South African Rand' },
  { code: 'BRL', label: 'BRL — Brazilian Real' },
  { code: 'MXN', label: 'MXN — Mexican Peso' },
  { code: 'SEK', label: 'SEK — Swedish Krona' },
  { code: 'NOK', label: 'NOK — Norwegian Krone' },
  { code: 'DKK', label: 'DKK — Danish Krone' },
  { code: 'ISK', label: 'ISK — Icelandic Krona' },
  { code: 'PLN', label: 'PLN — Polish Zloty' },
  { code: 'CZK', label: 'CZK — Czech Koruna' },
  { code: 'HUF', label: 'HUF — Hungarian Forint' },
  { code: 'RON', label: 'RON — Romanian Leu' },
  { code: 'BGN', label: 'BGN — Bulgarian Lev' },
  { code: 'TRY', label: 'TRY — Turkish Lira' },
  { code: 'UAH', label: 'UAH — Ukrainian Hryvnia' },
];

/**
 * Flightradar24 deep link from a flight number. Falls back to the explicit
 * tracking_url if one was stored on the flight record.
 */
export function getFlightTrackingUrl(flightNumber: string | null, trackingUrl: string | null): string | null {
  if (trackingUrl) return trackingUrl;
  if (!flightNumber) return null;
  const cleaned = flightNumber.replace(/\s+/g, '').toLowerCase();
  return `https://www.flightradar24.com/data/flights/${cleaned}`;
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

function isoToLocalDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

interface FlightDateInput {
  direction: CfpFlightDirection;
  arrival_time: string | null;
  departure_time: string | null;
}

/**
 * Derive hotel check-in/out dates from a speaker's flights.
 * check_in_date  comes from the earliest inbound flight's arrival.
 * check_out_date comes from the latest outbound flight's departure.
 * Either side can be null if only one direction is booked.
 */
export function deriveHotelDatesFromFlights(flights: FlightDateInput[]): {
  check_in_date: string | null;
  check_out_date: string | null;
  nights: number | null;
} | null {
  const inbound = flights
    .filter((f) => f.direction === 'inbound' && f.arrival_time)
    .sort((a, b) => new Date(a.arrival_time!).getTime() - new Date(b.arrival_time!).getTime());
  const outbound = flights
    .filter((f) => f.direction === 'outbound' && f.departure_time)
    .sort((a, b) => new Date(b.departure_time!).getTime() - new Date(a.departure_time!).getTime());

  const arrival = inbound[0]?.arrival_time ?? null;
  const departure = outbound[0]?.departure_time ?? null;
  if (!arrival && !departure) return null;

  const check_in_date = arrival ? isoToLocalDate(arrival) : null;
  const check_out_date = departure ? isoToLocalDate(departure) : null;
  const nights = check_in_date && check_out_date ? calculateNights(check_in_date, check_out_date) : null;
  return { check_in_date, check_out_date, nights };
}
