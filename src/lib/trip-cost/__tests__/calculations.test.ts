import { describe, it, expect } from 'vitest';
import {
  computeTripCost,
  getTravelCostCHF,
  getHotelPerNightCHF,
  convertToEUR,
  encodeToSearchParams,
  decodeFromSearchParams,
  getTotalBucket,
  type TripCostInput,
} from '../calculations';
import { FALLBACK_EUR_RATE, buildSkyscannerUrl, buildKiwiUrl, buildGoogleFlightsUrl, buildHotelUrl } from '@/config/trip-cost';

const RATE = FALLBACK_EUR_RATE; // 0.93

describe('convertToEUR', () => {
  it('converts CHF to EUR using the fallback rate', () => {
    expect(convertToEUR(100)).toBe(Math.round(100 * RATE));
  });

  it('converts CHF to EUR using a custom rate', () => {
    expect(convertToEUR(100, 0.90)).toBe(90);
  });

  it('returns 0 for 0 input', () => {
    expect(convertToEUR(0)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    // 0.93 * 101 = 93.93 → 94
    expect(convertToEUR(101)).toBe(Math.round(101 * RATE));
  });
});

describe('getTravelCostCHF', () => {
  it('returns low cost for europe at step 0', () => {
    expect(getTravelCostCHF('europe', 0)).toBe(100);
  });

  it('returns mid cost for europe at step 1', () => {
    expect(getTravelCostCHF('europe', 1)).toBe(175);
  });

  it('returns high cost for europe at step 2', () => {
    expect(getTravelCostCHF('europe', 2)).toBe(250);
  });

  it('returns low cost for international at step 0', () => {
    expect(getTravelCostCHF('international', 0)).toBe(350);
  });

  it('returns mid cost for international at step 1', () => {
    expect(getTravelCostCHF('international', 1)).toBe(500);
  });

  it('returns high cost for international at step 2', () => {
    expect(getTravelCostCHF('international', 2)).toBe(700);
  });

  it('clamps out-of-range step to max', () => {
    expect(getTravelCostCHF('europe', 10)).toBe(250);
  });
});

describe('getHotelPerNightCHF', () => {
  it('returns Vision Apartments estimate for "vision"', () => {
    expect(getHotelPerNightCHF('vision', 0)).toBe(115);
  });

  it('returns ibis Budget estimate for "ibis"', () => {
    expect(getHotelPerNightCHF('ibis', 0)).toBe(140);
  });

  it('returns MEININGER private room estimate for "meininger"', () => {
    expect(getHotelPerNightCHF('meininger', 0)).toBe(140);
  });

  it('returns MEININGER hostel estimate for "hostel"', () => {
    expect(getHotelPerNightCHF('hostel', 0)).toBe(45);
  });

  it('returns custom price for "other"', () => {
    expect(getHotelPerNightCHF('other', 200)).toBe(200);
  });

  it('returns default custom price when "other" is 0', () => {
    // Falls back to DEFAULT_CUSTOM_HOTEL_CHF (130)
    expect(getHotelPerNightCHF('other', 0)).toBe(130);
  });
});

describe('computeTripCost', () => {
  const baseInput: TripCostInput = {
    ticketCHF: 175,
    hasTicket: false,
    travelRegion: 'europe',
    travelStep: 1,
    nights: 2,
    hotelType: 'ibis',
    customHotelCHF: 130,
  };

  it('computes correct total for default inputs', () => {
    const result = computeTripCost(baseInput);
    // ticket 175 + travel 175 + hotel (140 * 2 = 280) = 630
    expect(result.ticketCHF).toBe(175);
    expect(result.travelCHF).toBe(175);
    expect(result.hotelPerNightCHF).toBe(140);
    expect(result.hotelTotalCHF).toBe(280);
    expect(result.totalCHF).toBe(630);
    expect(result.totalEUR).toBe(Math.round(630 * RATE));
  });

  it('uses custom EUR rate when provided', () => {
    const result = computeTripCost(baseInput, 0.85);
    expect(result.totalEUR).toBe(Math.round(630 * 0.85));
  });

  it('sets ticket to 0 when hasTicket is true', () => {
    const result = computeTripCost({ ...baseInput, hasTicket: true });
    expect(result.ticketCHF).toBe(0);
    expect(result.totalCHF).toBe(175 + 280); // travel + hotel only
  });

  it('handles international travel', () => {
    const result = computeTripCost({
      ...baseInput,
      travelRegion: 'international',
      travelStep: 2,
    });
    expect(result.travelCHF).toBe(700);
  });

  it('handles custom hotel', () => {
    const result = computeTripCost({
      ...baseInput,
      hotelType: 'other',
      customHotelCHF: 250,
    });
    expect(result.hotelPerNightCHF).toBe(250);
    expect(result.hotelTotalCHF).toBe(500);
  });

  it('handles hostel option', () => {
    const result = computeTripCost({
      ...baseInput,
      hotelType: 'hostel',
    });
    expect(result.hotelPerNightCHF).toBe(45);
    expect(result.hotelTotalCHF).toBe(90);
  });

  it('handles 0 nights', () => {
    const result = computeTripCost({ ...baseInput, nights: 0 });
    expect(result.hotelTotalCHF).toBe(0);
  });

  it('clamps negative ticket to 0', () => {
    const result = computeTripCost({ ...baseInput, ticketCHF: -50 });
    expect(result.ticketCHF).toBe(0);
  });
});

describe('encodeToSearchParams / decodeFromSearchParams', () => {
  const input: TripCostInput = {
    ticketCHF: 200,
    hasTicket: false,
    travelRegion: 'international',
    travelStep: 2,
    nights: 3,
    hotelType: 'vision',
    customHotelCHF: 130,
  };

  it('round-trips input through encode/decode', () => {
    const params = encodeToSearchParams(input);
    const decoded = decodeFromSearchParams(params);

    expect(decoded.ticketCHF).toBe(200);
    expect(decoded.travelRegion).toBe('international');
    expect(decoded.travelStep).toBe(2);
    expect(decoded.nights).toBe(3);
    expect(decoded.hotelType).toBe('vision');
    expect(decoded.hasTicket).toBeUndefined(); // false is not encoded
  });

  it('encodes hasTicket when true', () => {
    const params = encodeToSearchParams({ ...input, hasTicket: true });
    const decoded = decodeFromSearchParams(params);
    expect(decoded.hasTicket).toBe(true);
  });

  it('encodes custom hotel price for "other" type', () => {
    const params = encodeToSearchParams({
      ...input,
      hotelType: 'other',
      customHotelCHF: 999,
    });
    const decoded = decodeFromSearchParams(params);
    expect(decoded.hotelType).toBe('other');
    expect(decoded.customHotelCHF).toBe(999);
  });

  it('encodes and decodes airport', () => {
    const params = encodeToSearchParams({
      ...input,
      originAirport: 'LHR - London, United Kingdom',
    });
    const decoded = decodeFromSearchParams(params);
    expect(decoded.originAirport).toBe('LHR - London, United Kingdom');
  });

  it('encodes and decodes display currency', () => {
    const params = encodeToSearchParams({
      ...input,
      displayCurrency: 'EUR',
    });
    const decoded = decodeFromSearchParams(params);
    expect(decoded.displayCurrency).toBe('EUR');
  });

  it('does not encode CHF currency (default)', () => {
    const params = encodeToSearchParams({
      ...input,
      displayCurrency: 'CHF',
    });
    expect(params.get('currency')).toBeNull();
  });

  it('decodes meininger and hostel hotel types', () => {
    const meiningerParams = new URLSearchParams({ hotel: 'meininger' });
    expect(decodeFromSearchParams(meiningerParams).hotelType).toBe('meininger');

    const hostelParams = new URLSearchParams({ hotel: 'hostel' });
    expect(decodeFromSearchParams(hostelParams).hotelType).toBe('hostel');
  });

  it('decodes student ticket type', () => {
    const params = new URLSearchParams({ ticketType: 'student' });
    expect(decodeFromSearchParams(params).ticketType).toBe('student');
  });

  it('returns empty partial for empty params', () => {
    const decoded = decodeFromSearchParams(new URLSearchParams());
    expect(Object.keys(decoded)).toHaveLength(0);
  });

  it('ignores invalid values', () => {
    const params = new URLSearchParams({
      ticket: 'abc',
      region: 'mars',
      travelStep: '5',
      nights: '-1',
      hotel: 'palace',
    });
    const decoded = decodeFromSearchParams(params);
    expect(decoded.ticketCHF).toBeUndefined();
    expect(decoded.travelRegion).toBeUndefined();
    expect(decoded.travelStep).toBeUndefined();
    // nights: -1 is < 0 so should not be included
    expect(decoded.nights).toBeUndefined();
    expect(decoded.hotelType).toBeUndefined();
  });
});

describe('getTotalBucket', () => {
  it('returns correct bucket for small totals', () => {
    expect(getTotalBucket(0)).toBe('0-300');
    expect(getTotalBucket(299)).toBe('0-300');
  });

  it('returns correct bucket for mid totals', () => {
    expect(getTotalBucket(300)).toBe('300-600');
    expect(getTotalBucket(599)).toBe('300-600');
  });

  it('returns correct bucket for higher totals', () => {
    expect(getTotalBucket(600)).toBe('600-900');
    expect(getTotalBucket(900)).toBe('900-1200');
  });

  it('returns 1200+ for large totals', () => {
    expect(getTotalBucket(1200)).toBe('1200+');
    expect(getTotalBucket(5000)).toBe('1200+');
  });
});

describe('buildSkyscannerUrl', () => {
  it('builds correct Skyscanner deep link', () => {
    expect(buildSkyscannerUrl('LHR')).toBe(
      'https://www.skyscanner.net/transport/flights/lhr/zrh/260909/260912/'
    );
  });

  it('lowercases the IATA code', () => {
    expect(buildSkyscannerUrl('CDG')).toContain('/cdg/');
  });
});

describe('buildKiwiUrl', () => {
  it('builds correct Kiwi deep link', () => {
    expect(buildKiwiUrl('LHR')).toBe(
      'https://www.kiwi.com/en/search/results/LHR/ZRH/2026-09-09/2026-09-12'
    );
  });
});

describe('buildGoogleFlightsUrl', () => {
  it('builds correct Google Flights deep link', () => {
    const url = buildGoogleFlightsUrl('LHR');
    expect(url).toContain('google.com/travel/flights');
    expect(url).toContain('LHR');
    expect(url).toContain('ZRH');
  });
});

describe('buildHotelUrl', () => {
  it('appends UTM params with ? for clean URL', () => {
    const url = buildHotelUrl('https://example.com/hotel');
    expect(url).toContain('?utm_source=zurichjs');
    expect(url).toContain('utm_medium=trip-cost-calculator');
    expect(url).toContain('utm_campaign=conf2026');
  });

  it('appends UTM params with & when URL already has query params', () => {
    const url = buildHotelUrl('https://example.com/hotel?foo=bar');
    expect(url).toContain('&utm_source=zurichjs');
    expect(url).not.toContain('?utm_source');
  });
});
