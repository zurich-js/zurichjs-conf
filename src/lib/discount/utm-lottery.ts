/**
 * UTM-Based Lottery Discount System
 *
 * Triggers a lottery discount (5-15%) when visitors arrive via
 * specific offline marketing campaigns (QR codes, flyers, posters).
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

  // Valid values for utm_source (case-insensitive)
  validSources: ['offline', 'print'],

  // Valid values for utm_medium (case-insensitive)
  validMediums: ['qr_code', 'qr', 'flyer', 'poster'],

  // Substrings to match in utm_campaign (case-insensitive)
  campaignKeywords: ['business', 'card', 'faris', 'nadja', 'bogdan'],
} as const;

/**
 * Generates a random integer between min and max (inclusive)
 */
function randomIntBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Checks if UTM parameters match the lottery criteria
 */
function matchesLotteryCriteria(params: UtmParams): boolean {
  const { utm_source, utm_medium, utm_campaign } = params;

  // All three parameters must be present
  if (!utm_source || !utm_medium || !utm_campaign) {
    return false;
  }

  const sourceLower = utm_source.toLowerCase();
  const mediumLower = utm_medium.toLowerCase();
  const campaignLower = utm_campaign.toLowerCase();

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
export function evaluateUtmLottery(params: UtmParams): LotteryResult {
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
