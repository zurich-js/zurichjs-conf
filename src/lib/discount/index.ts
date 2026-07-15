export type {
  DiscountState,
  DiscountData,
  DiscountConfig,
  DiscountVariantConfig,
  GenerateDiscountResponse,
  DiscountStatusResponse,
} from './types';

export { COOKIE_NAMES, getClientConfig, getServerConfig } from './config';
export {
  DISCOUNT_EXPERIMENT_FLAG,
  DISCOUNT_VARIANTS,
  isDiscountVariant,
  getVariantServerConfig,
  applyPriceSensitivityGate,
  type DiscountVariant,
  type GatedVariant,
} from './experiment';
export {
  LOWER_INCOME_EUROPEAN_COUNTRIES,
  PRICE_SENSITIVE_MIN_VISITS,
  PRICE_SENSITIVITY_REASONS,
  isLowerIncomeEuropeanCountry,
  getPriceSensitivityEligibility,
  getClientDetectedCountry,
  type PriceSensitivityReason,
  type PriceSensitivityEligibility,
} from './price-sensitivity';
export { recordVisit, getVisitCount, VISIT_SESSION_GAP_MS } from './visit-tracker';
export { isKnownTicketHolder, markTicketHolder } from './ticket-holder';
export {
  buildDiscountPersonalization,
  type DiscountPersonalization,
} from './personalization';
export {
  getCookie,
  setCookie,
  deleteCookie,
  hasCooldownCookie,
  hasDismissedCookie,
  setCooldownCookie,
  setDismissedCookie,
  clearDiscountCookies,
} from './cookies';
export {
  evaluateUtmLottery,
  parseUtmParams,
  type UtmParams,
  type LotteryResult,
} from './utm-lottery';
