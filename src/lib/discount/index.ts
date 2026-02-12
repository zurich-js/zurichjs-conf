export type {
  DiscountState,
  DiscountData,
  DiscountConfig,
  GenerateDiscountResponse,
  DiscountStatusResponse,
} from './types';

export { COOKIE_NAMES, getClientConfig, getServerConfig } from './config';
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
