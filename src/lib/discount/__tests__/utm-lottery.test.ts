import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { evaluateUtmLottery, parseUtmParams } from '../utm-lottery';
import type { UtmParams } from '../utm-lottery';

describe('evaluateUtmLottery', () => {
  beforeEach(() => {
    // Seed Math.random for deterministic tests
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('eligible UTM combinations', () => {
    it('returns eligible for valid offline + qr_code + business_card campaign', () => {
      const result = evaluateUtmLottery({
        utm_source: 'offline',
        utm_medium: 'qr_code',
        utm_campaign: 'business_card_zurich',
      });
      expect(result.eligible).toBe(true);
      expect(result.percentOff).toBeGreaterThanOrEqual(5);
      expect(result.percentOff).toBeLessThanOrEqual(15);
      expect(result.source).toContain('utm:offline/qr_code/business_card_zurich');
    });

    it('is case-insensitive for source', () => {
      const result = evaluateUtmLottery({
        utm_source: 'OFFLINE',
        utm_medium: 'qr',
        utm_campaign: 'faris_meetup',
      });
      expect(result.eligible).toBe(true);
    });

    it('is case-insensitive for medium', () => {
      const result = evaluateUtmLottery({
        utm_source: 'print',
        utm_medium: 'FLYER',
        utm_campaign: 'nadja_event',
      });
      expect(result.eligible).toBe(true);
    });

    it('is case-insensitive for campaign keyword matching', () => {
      const result = evaluateUtmLottery({
        utm_source: 'offline',
        utm_medium: 'poster',
        utm_campaign: 'BOGDAN_TALK',
      });
      expect(result.eligible).toBe(true);
    });

    it('matches campaign keywords as substrings', () => {
      const result = evaluateUtmLottery({
        utm_source: 'offline',
        utm_medium: 'qr',
        utm_campaign: 'my_business_event_2026',
      });
      expect(result.eligible).toBe(true);
    });

    it('accepts all valid medium values', () => {
      const mediums = ['qr_code', 'qr', 'flyer', 'poster'];
      for (const medium of mediums) {
        const result = evaluateUtmLottery({
          utm_source: 'offline',
          utm_medium: medium,
          utm_campaign: 'business_card',
        });
        expect(result.eligible).toBe(true);
      }
    });
  });

  describe('ineligible UTM combinations', () => {
    it('returns ineligible when utm_source is missing', () => {
      const result = evaluateUtmLottery({
        utm_medium: 'qr_code',
        utm_campaign: 'business_card',
      });
      expect(result.eligible).toBe(false);
      expect(result.percentOff).toBe(0);
    });

    it('returns ineligible when utm_medium is missing', () => {
      const result = evaluateUtmLottery({
        utm_source: 'offline',
        utm_campaign: 'business_card',
      });
      expect(result.eligible).toBe(false);
    });

    it('returns ineligible when utm_campaign is missing', () => {
      const result = evaluateUtmLottery({
        utm_source: 'offline',
        utm_medium: 'qr_code',
      });
      expect(result.eligible).toBe(false);
    });

    it('returns ineligible for invalid source', () => {
      const result = evaluateUtmLottery({
        utm_source: 'google',
        utm_medium: 'qr_code',
        utm_campaign: 'business_card',
      });
      expect(result.eligible).toBe(false);
    });

    it('returns ineligible for invalid medium', () => {
      const result = evaluateUtmLottery({
        utm_source: 'offline',
        utm_medium: 'email',
        utm_campaign: 'business_card',
      });
      expect(result.eligible).toBe(false);
    });

    it('returns ineligible when campaign has no matching keyword', () => {
      const result = evaluateUtmLottery({
        utm_source: 'offline',
        utm_medium: 'qr_code',
        utm_campaign: 'random_campaign_2026',
      });
      expect(result.eligible).toBe(false);
    });

    it('returns ineligible for empty params', () => {
      expect(evaluateUtmLottery({}).eligible).toBe(false);
    });
  });

  describe('discount range', () => {
    it('returns minimum discount when Math.random is 0', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const result = evaluateUtmLottery({
        utm_source: 'offline',
        utm_medium: 'qr_code',
        utm_campaign: 'business_card',
      });
      expect(result.percentOff).toBe(5);
    });

    it('returns maximum discount when Math.random approaches 1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999);
      const result = evaluateUtmLottery({
        utm_source: 'offline',
        utm_medium: 'qr_code',
        utm_campaign: 'business_card',
      });
      expect(result.percentOff).toBe(15);
    });
  });
});

describe('parseUtmParams', () => {
  it('parses URLSearchParams', () => {
    const params = new URLSearchParams('utm_source=offline&utm_medium=qr&utm_campaign=card');
    const result = parseUtmParams(params);
    expect(result).toEqual({
      utm_source: 'offline',
      utm_medium: 'qr',
      utm_campaign: 'card',
    });
  });

  it('parses a string', () => {
    const result = parseUtmParams('utm_source=print&utm_medium=flyer&utm_campaign=business');
    expect(result.utm_source).toBe('print');
    expect(result.utm_medium).toBe('flyer');
    expect(result.utm_campaign).toBe('business');
  });

  it('returns undefined for missing params', () => {
    const result = parseUtmParams('utm_source=offline');
    expect(result.utm_source).toBe('offline');
    expect(result.utm_medium).toBeUndefined();
    expect(result.utm_campaign).toBeUndefined();
  });

  it('returns all undefined for empty string', () => {
    const result = parseUtmParams('');
    expect(result.utm_source).toBeUndefined();
    expect(result.utm_medium).toBeUndefined();
    expect(result.utm_campaign).toBeUndefined();
  });
});
