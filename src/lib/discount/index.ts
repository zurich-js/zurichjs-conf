export type {
  DiscountState,
  DiscountData,
  DiscountConfig,
  DiscountAction,
  GenerateDiscountResponse,
  DiscountStatusResponse,
} from './types';

export { COOKIE_NAMES, getClientConfig, getServerConfig } from './config';
export { getBrowserFingerprint } from './fingerprint';
export { shouldShowDiscount } from './prng';
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

// NOTE: server.ts is NOT exported here to avoid bundling server-only code for client
// Import directly: import { getServerSideDiscount } from '@/lib/discount/server'
