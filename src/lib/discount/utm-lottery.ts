/**
 * UTM-Based Lottery Discount System
 *
 * Triggers a lottery discount when visitors arrive via specific offline
 * marketing campaigns (QR codes, flyers, posters).
 */

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export interface LotteryResult {
  eligible: boolean;
  percentOff: number;
  source?: string;
}

/**
 * UTM Lottery Configuration
 *
 * Extend these arrays to add new matching criteria.
 */
const LOTTERY_CONFIG = {
  // Minimum and maximum discount percentages
  minPercent: 5,
  maxPercent: 15,

  // Exact-match campaigns that should always receive a specific discount
  guaranteedDiscounts: [
    {
      source: 'offline',
      medium: 'qr_code',
      campaign: 'business_card_bogdan',
      percentOff: 20,
      activeFrom: '2026-05-15T00:00:00+02:00',
      activeUntil: '2026-05-17T00:00:00+02:00',
    },
  ],

  // Valid values for utm_source (case-insensitive)
  validSources: ['offline', 'print'],

  // Valid values for utm_medium (case-insensitive)
  validMediums: ['qr_code', 'qr', 'flyer', 'poster'],

  // Substrings to match in utm_campaign (case-insensitive)
  campaignKeywords: ['business', 'card', 'faris', 'nadja', 'bogdan'],
} as const;

export const LOTTERY_PERCENT_BOUNDS = {
  minPercent: LOTTERY_CONFIG.minPercent,
  maxPercent: LOTTERY_CONFIG.maxPercent,
} as const;

function normalizeUtmValue(value: string): string {
  return value.toLowerCase();
}

function hasRequiredUtmParams(params: UtmParams): params is Required<UtmParams> {
  return Boolean(params.utm_source && params.utm_medium && params.utm_campaign);
}

/**
 * Generates a random integer between min and max (inclusive)
 */
function randomIntBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isGuaranteedDiscountActive(
  discount: (typeof LOTTERY_CONFIG.guaranteedDiscounts)[number],
  now: Date
): boolean {
  const nowMs = now.getTime();
  return (
    nowMs >= new Date(discount.activeFrom).getTime() &&
    nowMs < new Date(discount.activeUntil).getTime()
  );
}

function getGuaranteedDiscount(params: Required<UtmParams>, now: Date): number | null {
  const sourceLower = normalizeUtmValue(params.utm_source);
  const mediumLower = normalizeUtmValue(params.utm_medium);
  const campaignLower = normalizeUtmValue(params.utm_campaign);

  const guaranteedDiscount = LOTTERY_CONFIG.guaranteedDiscounts.find(
    (discount) =>
      sourceLower === normalizeUtmValue(discount.source) &&
      mediumLower === normalizeUtmValue(discount.medium) &&
      campaignLower === normalizeUtmValue(discount.campaign) &&
      isGuaranteedDiscountActive(discount, now)
  );

  return guaranteedDiscount?.percentOff ?? null;
}

export function isValidLotteryPercent(
  percentOff: unknown,
  now: Date = new Date()
): percentOff is number {
  if (typeof percentOff !== 'number') {
    return false;
  }

  if (
    percentOff >= LOTTERY_PERCENT_BOUNDS.minPercent &&
    percentOff <= LOTTERY_PERCENT_BOUNDS.maxPercent
  ) {
    return true;
  }

  return LOTTERY_CONFIG.guaranteedDiscounts.some(
    (discount) =>
      discount.percentOff === percentOff &&
      isGuaranteedDiscountActive(discount, now)
  );
}

/**
 * Checks if UTM parameters match the lottery criteria
 */
function matchesLotteryCriteria(params: UtmParams): boolean {
  if (!hasRequiredUtmParams(params)) {
    return false;
  }

  const sourceLower = normalizeUtmValue(params.utm_source);
  const mediumLower = normalizeUtmValue(params.utm_medium);
  const campaignLower = normalizeUtmValue(params.utm_campaign);

  // Check source matches
  const sourceMatches = LOTTERY_CONFIG.validSources.some(
    (s) => sourceLower === s
  );
  if (!sourceMatches) return false;

  // Check medium matches
  const mediumMatches = LOTTERY_CONFIG.validMediums.some(
    (m) => mediumLower === m
  );
  if (!mediumMatches) return false;

  // Check campaign contains at least one keyword
  const campaignMatches = LOTTERY_CONFIG.campaignKeywords.some((keyword) =>
    campaignLower.includes(keyword)
  );
  if (!campaignMatches) return false;

  return true;
}

/**
 * Evaluates UTM parameters and returns lottery result
 *
 * @param params - UTM parameters from URL
 * @returns LotteryResult with eligibility and discount percentage
 */
export function evaluateUtmLottery(
  params: UtmParams,
  now: Date = new Date()
): LotteryResult {
  if (hasRequiredUtmParams(params)) {
    const guaranteedPercentOff = getGuaranteedDiscount(params, now);
    if (guaranteedPercentOff !== null) {
      return {
        eligible: true,
        percentOff: guaranteedPercentOff,
        source: `utm:${params.utm_source}/${params.utm_medium}/${params.utm_campaign}`,
      };
    }
  }

  if (!matchesLotteryCriteria(params)) {
    return { eligible: false, percentOff: 0 };
  }

  const percentOff = randomIntBetween(
    LOTTERY_CONFIG.minPercent,
    LOTTERY_CONFIG.maxPercent
  );

  return {
    eligible: true,
    percentOff,
    source: `utm:${params.utm_source}/${params.utm_medium}/${params.utm_campaign}`,
  };
}

/**
 * Parses UTM parameters from a URL search string or URLSearchParams
 */
export function parseUtmParams(
  searchParams: URLSearchParams | string
): UtmParams {
  const params =
    typeof searchParams === 'string'
      ? new URLSearchParams(searchParams)
      : searchParams;

  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
  };
}
