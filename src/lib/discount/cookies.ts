/**
 * Discount Cookie Helpers (client-side)
 *
 * Manages regular cookies for cooldown and dismissed state.
 * httpOnly cookies (discount_code, discount_expires_at) are managed by the API routes.
 */

import { COOKIE_NAMES } from './config';

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function hasCooldownCookie(): boolean {
  return getCookie(COOKIE_NAMES.COOLDOWN) === '1';
}

export function hasDismissedCookie(): boolean {
  return getCookie(COOKIE_NAMES.DISMISSED) === '1';
}

export function setCooldownCookie(hours: number): void {
  setCookie(COOKIE_NAMES.COOLDOWN, '1', hours * 3600);
}

export function setDismissedCookie(): void {
  // Dismissed state lasts until the discount expires (max 24h as fallback)
  setCookie(COOKIE_NAMES.DISMISSED, '1', 24 * 3600);
}

export function clearDiscountCookies(): void {
  deleteCookie(COOKIE_NAMES.COOLDOWN);
  deleteCookie(COOKIE_NAMES.DISMISSED);
}
