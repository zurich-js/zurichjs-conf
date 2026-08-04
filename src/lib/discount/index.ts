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

export { COOKIE_NAMES, getServerConfig } from './config';
export {
  recordVisit,
  getVisitCount,
  isRecurringVisitor,
  VISIT_SESSION_GAP_MS,
  RECURRING_VISITOR_MIN_VISITS,
} from './visit-tracker';
export { isKnownTicketHolder, markTicketHolder } from './ticket-holder';
// NOTE: corporate-code.ts is deliberately NOT exported here — it reads a server
// secret. Import it directly in API routes.
export {
  isCorporateBuyer,
  markCorporateBuyer,
  clearCorporateBuyer,
} from './corporate-buyer';
export {
  buildDiscountPersonalization,
  type DiscountPersonalization,
} from './personalization';
export {
  getCookie,
  setCookie,
  deleteCookie,
  hasDismissedCookie,
  setDismissedCookie,
  clearDiscountCookies,
} from './cookies';
export {
  evaluateUtmLottery,
  parseUtmParams,
  type UtmParams,
  type LotteryResult,
} from './utm-lottery';
