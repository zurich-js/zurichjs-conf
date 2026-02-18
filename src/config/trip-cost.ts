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
    highCHF: 300,
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
}

export const HOTEL_OPTIONS: HotelOption[] = [
  {
    id: 'hostel',
    label: 'MEININGER Hostel',
    sublabel: 'Shared room · backpacker',
    estimatePerNightCHF: 45,
    url: 'https://www.meininger-hotels.com/en/hotels/zurich/hotel-zurich-greencity/',
  },
  {
    id: 'vision',
    label: 'Vision Apartments',
    sublabel: 'Zurich · serviced apartments',
    estimatePerNightCHF: 115,
    url: 'https://www.visionapartments.com/en/destinations/zurich',
  },
  {
    id: 'ibis',
    label: 'ibis Budget',
    sublabel: 'Near Technopark · budget hotel',
    estimatePerNightCHF: 140,
    url: 'https://all.accor.com/hotel/8585/index.en.shtml',
  },
  {
    id: 'meininger',
    label: 'MEININGER Hotel',
    sublabel: 'Greencity · private room',
    estimatePerNightCHF: 140,
    url: 'https://www.meininger-hotels.com/en/hotels/zurich/hotel-zurich-greencity/',
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

/**
 * Build a Skyscanner deep link for flights to Zurich.
 * Dates: Sept 9–12, 2026 (conference window).
 * Format: YYMMDD
 */
export function buildSkyscannerUrl(originIata: string): string {
  const origin = originIata.toLowerCase();
  // Sept 9 2026 → 260909, Sept 12 2026 → 260912
  return `https://www.skyscanner.net/transport/flights/${origin}/zrh/260909/260912/`;
}

/** Build a Kiwi.com deep link for flights to Zurich */
export function buildKiwiUrl(originIata: string): string {
  return `https://www.kiwi.com/en/search/tiles/${originIata.toLowerCase()}/zurich-switzerland/2026-09-09/2026-09-12`;
}
