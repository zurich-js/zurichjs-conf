/**
 * Trip Cost Calculator Configuration
 *
 * All defaults, ranges, and conversion rates for the trip cost estimator.
 * Prices are stored in CHF. EUR equivalents are computed at runtime using
 * a live ECB exchange rate fetched from the Frankfurter API.
 */

/** Fallback EUR/CHF rate used when the Frankfurter API is unavailable */
export const FALLBACK_EUR_RATE = 0.93;

/** Default ticket price in CHF (early bird standard, used as fallback) */
export const DEFAULT_TICKET_PRICE_CHF = 175;

/** Display currency options */
export type DisplayCurrency = 'CHF' | 'EUR';

/** Ticket type for calculator */
export type TicketType = 'standard' | 'vip' | 'student' | 'have_ticket';

/** Which days the attendee plans to attend — determines recommended hotel nights */
export type AttendanceDays = 'main_only' | 'main_workshop' | 'all_days';

export interface AttendanceOption {
  id: AttendanceDays;
  label: string;
  sublabel: string;
  nights: number;
  dates: string;
  hint?: string;
}

export const ATTENDANCE_OPTIONS: AttendanceOption[] = [
  {
    id: 'main_only',
    label: 'Main day only',
    sublabel: 'Sep 11th — conference talks & networking',
    nights: 2,
    dates: 'Sep 10th–12th',
  },
  {
    id: 'main_workshop',
    label: 'Workshop + Main day',
    sublabel: 'Sep 10th workshop · Sep 11th conference',
    nights: 3,
    dates: 'Sep 9th–12th',
  },
  {
    id: 'all_days',
    label: 'Full experience (Workshop + VIP)',
    sublabel: 'Sep 10th workshop · Sep 11th conference · Sep 12th VIP activities with speakers',
    nights: 3,
    dates: 'Sep 9th–12th',
    hint: 'We recommend a return flight after 18:00 on Sep 12th',
  },
];

/** Travel origin region */
export type TravelRegion = 'europe' | 'international';

/** Travel cost ranges in CHF (round-trip estimates, train or plane) */
export interface TravelRange {
  label: string;
  lowCHF: number;
  midCHF: number;
  highCHF: number;
}

export const TRAVEL_RANGES: Record<TravelRegion, TravelRange> = {
  europe: {
    label: 'From Europe',
    lowCHF: 100,
    midCHF: 175,
    highCHF: 250,
  },
  international: {
    label: 'International',
    lowCHF: 350,
    midCHF: 500,
    highCHF: 700,
  },
};

/** Travel cost slider steps (index into low/mid/high) */
export const TRAVEL_STEPS = [
  { label: 'Budget', key: 'lowCHF' as const },
  { label: 'Typical', key: 'midCHF' as const },
  { label: 'Premium', key: 'highCHF' as const },
];

/** Hotel option types */
export type HotelType = 'vision' | 'ibis' | 'meininger' | 'hostel' | 'other';

export interface HotelOption {
  id: HotelType;
  label: string;
  sublabel: string;
  estimatePerNightCHF: number;
  url?: string;
  /** Approx distance from venue (Technopark) by public transport */
  distanceFromVenue?: string;
  /** Group key — options with same group are paired together visually */
  group?: string;
}

/** UTM parameters appended to hotel links */
export const TRIP_COST_UTM = 'utm_source=zurichjs&utm_medium=trip-cost-calculator&utm_campaign=conf2026';

/** Append UTM params to a hotel URL */
export function buildHotelUrl(baseUrl: string): string {
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}${TRIP_COST_UTM}`;
}

export const HOTEL_OPTIONS: HotelOption[] = [
  {
    id: 'hostel',
    label: 'MEININGER Shared Room',
    sublabel: 'Backpacker · hostel style',
    estimatePerNightCHF: 45,
    url: 'https://www.meininger-hotels.com/en/hotels/zurich/hotel-zurich-greencity/',
    distanceFromVenue: '~20 min by tram',
    group: 'meininger',
  },
  {
    id: 'meininger',
    label: 'MEININGER Private Room',
    sublabel: 'Greencity · private room',
    estimatePerNightCHF: 140,
    url: 'https://www.meininger-hotels.com/en/hotels/zurich/hotel-zurich-greencity/',
    distanceFromVenue: '~20 min by tram',
    group: 'meininger',
  },
  {
    id: 'vision',
    label: 'Vision Apartments',
    sublabel: 'Zurich · serviced apartments',
    estimatePerNightCHF: 115,
    url: 'https://visionapartments.com/en',
    distanceFromVenue: '~15 min by tram',
  },
  {
    id: 'ibis',
    label: 'ibis Budget',
    sublabel: 'Near Technopark · budget hotel',
    estimatePerNightCHF: 140,
    url: 'https://all.accor.com/hotel/3184/index.en.shtml',
    distanceFromVenue: '~5 min walk',
  },
  {
    id: 'other',
    label: 'Other',
    sublabel: 'Enter your own estimate',
    estimatePerNightCHF: 0,
  },
];

/** Default number of hotel nights */
export const DEFAULT_NIGHTS = 2;

/** Min/max nights for the stepper */
export const MIN_NIGHTS = 1;
export const MAX_NIGHTS = 7;

/** Default custom hotel price per night */
export const DEFAULT_CUSTOM_HOTEL_CHF = 130;

/** Build a Google Flights deep link for flights to Zurich */
export function buildGoogleFlightsUrl(originIata: string): string {
  // Google Flights format: /flights/{from}-{to}/{outbound}/{return}
  return `https://www.google.com/travel/flights?q=Flights%20to%20ZRH%20from%20${originIata.toUpperCase()}%20on%202026-09-09%20through%202026-09-12`;
}
