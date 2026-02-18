/**
 * Trip Cost Calculator — Pure Calculation Functions
 *
 * All functions are pure (no side effects) and easily testable.
 */

import {
  EUR_TO_CHF_RATE,
  TRAVEL_RANGES,
  TRAVEL_STEPS,
  HOTEL_OPTIONS,
  DEFAULT_CUSTOM_HOTEL_CHF,
  type TravelRegion,
  type HotelType,
} from '@/config/trip-cost';

export interface TripCostInput {
  /** Ticket price in CHF (0 if already have ticket) */
  ticketCHF: number;
  /** Whether the user already has a ticket */
  hasTicket: boolean;
  /** Travel region */
  travelRegion: TravelRegion;
  /** Travel cost step index (0=low, 1=mid, 2=high) */
  travelStep: number;
  /** Number of hotel nights */
  nights: number;
  /** Hotel type */
  hotelType: HotelType;
  /** Custom hotel price per night in CHF (used when hotelType === 'other') */
  customHotelCHF: number;
}

export interface TripCostBreakdown {
  ticketCHF: number;
  travelCHF: number;
  travelEUR: number;
  hotelPerNightCHF: number;
  hotelTotalCHF: number;
  nights: number;
  totalCHF: number;
  totalEUR: number;
}

/** Get the travel cost in CHF for a given region and step */
export function getTravelCostCHF(region: TravelRegion, stepIndex: number): number {
  const range = TRAVEL_RANGES[region];
  const step = TRAVEL_STEPS[Math.min(stepIndex, TRAVEL_STEPS.length - 1)];
  return range[step.key];
}

/** Get the hotel cost per night in CHF for a given hotel type */
export function getHotelPerNightCHF(hotelType: HotelType, customCHF: number): number {
  if (hotelType === 'other') {
    return customCHF || DEFAULT_CUSTOM_HOTEL_CHF;
  }
  const option = HOTEL_OPTIONS.find((h) => h.id === hotelType);
  return option?.estimatePerNightCHF ?? 0;
}

/** Convert CHF amount to EUR */
export function convertToEUR(chf: number): number {
  return Math.round(chf * EUR_TO_CHF_RATE);
}

/** Compute the full trip cost breakdown */
export function computeTripCost(input: TripCostInput): TripCostBreakdown {
  const ticketCHF = input.hasTicket ? 0 : Math.max(0, input.ticketCHF);
  const travelCHF = getTravelCostCHF(input.travelRegion, input.travelStep);
  const hotelPerNightCHF = getHotelPerNightCHF(input.hotelType, input.customHotelCHF);
  const hotelTotalCHF = hotelPerNightCHF * Math.max(0, input.nights);
  const totalCHF = ticketCHF + travelCHF + hotelTotalCHF;

  return {
    ticketCHF,
    travelCHF,
    travelEUR: convertToEUR(travelCHF),
    hotelPerNightCHF,
    hotelTotalCHF,
    nights: input.nights,
    totalCHF,
    totalEUR: convertToEUR(totalCHF),
  };
}

/** Encode trip cost inputs into URL search params */
export function encodeToSearchParams(input: TripCostInput): URLSearchParams {
  const params = new URLSearchParams();
  params.set('ticket', String(input.ticketCHF));
  if (input.hasTicket) params.set('hasTicket', '1');
  params.set('region', input.travelRegion);
  params.set('travelStep', String(input.travelStep));
  params.set('nights', String(input.nights));
  params.set('hotel', input.hotelType);
  if (input.hotelType === 'other') {
    params.set('hotelPrice', String(input.customHotelCHF));
  }
  return params;
}

/** Decode URL search params into trip cost inputs (returns partial — merge with defaults) */
export function decodeFromSearchParams(
  params: URLSearchParams
): Partial<TripCostInput> {
  const result: Partial<TripCostInput> = {};

  const ticket = params.get('ticket');
  if (ticket !== null) {
    const parsed = parseInt(ticket, 10);
    if (!isNaN(parsed)) result.ticketCHF = parsed;
  }

  if (params.get('hasTicket') === '1') {
    result.hasTicket = true;
  }

  const region = params.get('region');
  if (region === 'europe' || region === 'international') {
    result.travelRegion = region;
  }

  const travelStep = params.get('travelStep');
  if (travelStep !== null) {
    const parsed = parseInt(travelStep, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 2) result.travelStep = parsed;
  }

  const nights = params.get('nights');
  if (nights !== null) {
    const parsed = parseInt(nights, 10);
    if (!isNaN(parsed) && parsed >= 0) result.nights = parsed;
  }

  const hotel = params.get('hotel');
  if (hotel === 'vision' || hotel === 'ibis' || hotel === 'other') {
    result.hotelType = hotel;
  }

  const hotelPrice = params.get('hotelPrice');
  if (hotelPrice !== null) {
    const parsed = parseInt(hotelPrice, 10);
    if (!isNaN(parsed)) result.customHotelCHF = parsed;
  }

  return result;
}

/** Get a total range bucket for analytics (e.g. "0-300", "300-600", etc.) */
export function getTotalBucket(totalCHF: number): string {
  if (totalCHF < 300) return '0-300';
  if (totalCHF < 600) return '300-600';
  if (totalCHF < 900) return '600-900';
  if (totalCHF < 1200) return '900-1200';
  return '1200+';
}
