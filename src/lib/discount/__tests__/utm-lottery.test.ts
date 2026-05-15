import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  evaluateUtmLottery,
  isValidLotteryPercent,
  parseUtmParams,
} from '../utm-lottery';

const BOGDAN_BUSINESS_CARD_PARAMS = parseUtmParams(
  '?utm_source=offline&utm_medium=qr_code&utm_campaign=business_card_bogdan'
);

describe('UTM lottery discounts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses supported UTM parameters and ignores unrelated query params', () => {
    expect(
      parseUtmParams(
        '?utm_source=offline&utm_medium=poster&utm_campaign=business_card&ref=homepage'
      )
    ).toEqual({
      utm_source: 'offline',
      utm_medium: 'poster',
      utm_campaign: 'business_card',
    });
  });

  it('returns undefined for missing UTM parameters', () => {
    expect(parseUtmParams('?utm_source=offline')).toEqual({
      utm_source: 'offline',
      utm_medium: undefined,
      utm_campaign: undefined,
    });
  });

  it('guarantees 20% off for Bogdan business card QR traffic', () => {
    expect(
      evaluateUtmLottery(
        BOGDAN_BUSINESS_CARD_PARAMS,
        new Date('2026-05-15T12:00:00+02:00')
      )
    ).toEqual({
      eligible: true,
      percentOff: 20,
      source: 'utm:offline/qr_code/business_card_bogdan',
    });
  });

  it('matches the guaranteed discount case-insensitively', () => {
    const params = parseUtmParams(
      '?utm_source=OFFLINE&utm_medium=QR_CODE&utm_campaign=Business_Card_Bogdan'
    );

    expect(
      evaluateUtmLottery(params, new Date('2026-05-16T23:59:59.999+02:00'))
    ).toMatchObject({
      eligible: true,
      percentOff: 20,
    });
  });

  it('falls back to the normal lottery outside May 15 and 16, 2026 GMT+2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);

    expect(
      evaluateUtmLottery(
        BOGDAN_BUSINESS_CARD_PARAMS,
        new Date('2026-05-14T23:59:59.999+02:00')
      )
    ).toMatchObject({
      eligible: true,
      percentOff: 15,
    });

    expect(
      evaluateUtmLottery(
        BOGDAN_BUSINESS_CARD_PARAMS,
        new Date('2026-05-17T00:00:00+02:00')
      )
    ).toMatchObject({
      eligible: true,
      percentOff: 15,
    });
  });

  it('applies the normal random lottery for other matching campaigns', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(
      evaluateUtmLottery(
        parseUtmParams(
          '?utm_source=print&utm_medium=flyer&utm_campaign=nadja_business_cards'
        ),
        new Date('2026-05-15T12:00:00+02:00')
      )
    ).toEqual({
      eligible: true,
      percentOff: 10,
      source: 'utm:print/flyer/nadja_business_cards',
    });
  });

  it('keeps the normal random lottery inside the configured inclusive bounds', () => {
    const params = parseUtmParams(
      '?utm_source=offline&utm_medium=poster&utm_campaign=faris_business_card'
    );

    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(evaluateUtmLottery(params).percentOff).toBe(5);

    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    expect(evaluateUtmLottery(params).percentOff).toBe(15);
  });

  it('rejects URLs that are missing required lottery UTM parameters', () => {
    expect(evaluateUtmLottery({})).toEqual({ eligible: false, percentOff: 0 });
    expect(evaluateUtmLottery({ utm_source: 'offline' })).toEqual({
      eligible: false,
      percentOff: 0,
    });
    expect(
      evaluateUtmLottery({
        utm_source: 'offline',
        utm_medium: 'qr_code',
      })
    ).toEqual({ eligible: false, percentOff: 0 });
  });

  it('rejects unsupported source, medium, and campaign values', () => {
    expect(
      evaluateUtmLottery({
        utm_source: 'email',
        utm_medium: 'qr_code',
        utm_campaign: 'business_card_bogdan',
      })
    ).toEqual({ eligible: false, percentOff: 0 });

    expect(
      evaluateUtmLottery({
        utm_source: 'offline',
        utm_medium: 'newsletter',
        utm_campaign: 'business_card_bogdan',
      })
    ).toEqual({ eligible: false, percentOff: 0 });

    expect(
      evaluateUtmLottery({
        utm_source: 'offline',
        utm_medium: 'qr_code',
        utm_campaign: 'conference_badge',
      })
    ).toEqual({ eligible: false, percentOff: 0 });
  });

  it('matches normal lottery criteria case-insensitively', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(
      evaluateUtmLottery({
        utm_source: 'PRINT',
        utm_medium: 'POSTER',
        utm_campaign: 'Faris_Business_Card',
      })
    ).toMatchObject({
      eligible: true,
      percentOff: 5,
    });
  });

  it('validates normal lottery percentages and the time-boxed 20% override', () => {
    expect(isValidLotteryPercent(5)).toBe(true);
    expect(isValidLotteryPercent(15)).toBe(true);
    expect(isValidLotteryPercent(4)).toBe(false);
    expect(isValidLotteryPercent(16)).toBe(false);
    expect(isValidLotteryPercent('10')).toBe(false);
    expect(
      isValidLotteryPercent(20, new Date('2026-05-15T12:00:00+02:00'))
    ).toBe(true);
    expect(
      isValidLotteryPercent(20, new Date('2026-05-17T00:00:00+02:00'))
    ).toBe(false);
  });
});
