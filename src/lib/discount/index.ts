export type {
  DiscountState,
  DiscountData,
  DiscountConfig,
  ResolvedDiscountConfig,
  DiscountClientConfigResponse,
  GenerateDiscountResponse,
  DiscountStatusResponse,
} from './types';
// NOTE: config-server.ts is deliberately NOT exported here — it pulls in the
// service-role Supabase client and must never reach a client bundle.

export { COOKIE_NAMES, getClientConfig, getServerConfig } from './config';
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
