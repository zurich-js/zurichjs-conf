/**
 * Trip Cost Calculator Configuration
 *
 * All defaults, ranges, and conversion rates for the trip cost estimator.
 * Prices are stored in CHF. EUR equivalents are computed at runtime.
 */

/** Estimated EUR → CHF conversion rate (approximate, updated periodically) */
export const EUR_TO_CHF_RATE = 0.93;

/** Default ticket price in CHF (early bird standard) */
export const DEFAULT_TICKET_PRICE_CHF = 175;

/** Travel origin region */
export type TravelRegion = 'europe' | 'international';

/** Travel cost ranges in CHF (round-trip estimates) */
export interface TravelRange {
  label: string;
  lowCHF: number;
  midCHF: number;
  highCHF: number;
}

export const TRAVEL_RANGES: Record<TravelRegion, TravelRange> = {
  europe: {
    label: 'From Europe',
    lowCHF: 50,
    midCHF: 150,
    highCHF: 350,
  },
  international: {
    label: 'International',
    lowCHF: 300,
    midCHF: 700,
    highCHF: 1200,
  },
};

/** Travel cost slider steps (index into low/mid/high) */
export const TRAVEL_STEPS = [
  { label: 'Budget', key: 'lowCHF' as const },
  { label: 'Typical', key: 'midCHF' as const },
  { label: 'Premium', key: 'highCHF' as const },
];

/** Hotel option types */
export type HotelType = 'vision' | 'ibis' | 'other';

export interface HotelOption {
  id: HotelType;
  label: string;
  sublabel: string;
  estimatePerNightCHF: number;
  url?: string;
}

export const HOTEL_OPTIONS: HotelOption[] = [
  {
    id: 'vision',
    label: 'Vision Apartments',
    sublabel: 'Zurich · mid-range',
    estimatePerNightCHF: 160,
    url: 'https://www.visionapartments.com/en/destinations/zurich',
  },
  {
    id: 'ibis',
    label: 'ibis Budget',
    sublabel: 'Near Technopark · budget',
    estimatePerNightCHF: 110,
    url: 'https://all.accor.com/hotel/8585/index.en.shtml',
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

/** Convert CHF to EUR */
export function chfToEur(chf: number): number {
  return Math.round(chf * EUR_TO_CHF_RATE);
}

