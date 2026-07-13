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
  type DiscountVariant,
} from './experiment';
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
