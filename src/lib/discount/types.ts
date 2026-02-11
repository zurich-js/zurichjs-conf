/**
 * Discount Pop-up System Types
 */

export type DiscountState = 'idle' | 'loading' | 'modal_open' | 'minimized' | 'expired';

export interface DiscountData {
  code: string;
  expiresAt: string;
  percentOff: number;
}

export interface DiscountConfig {
  showProbability: number;
  percentOff: number;
  durationMinutes: number;
  cooldownHours: number;
  forceShow: boolean;
}

export interface GenerateDiscountResponse {
  code: string;
  expiresAt: string;
  percentOff: number;
}

export interface DiscountStatusResponse {
  active: boolean;
  code?: string;
  expiresAt?: string;
  percentOff?: number;
}

export type DiscountAction =
  | { type: 'START_LOADING' }
  | { type: 'SHOW_MODAL'; data: DiscountData }
  | { type: 'RESTORE_MINIMIZED'; data: DiscountData }
  | { type: 'DISMISS' }
  | { type: 'REOPEN' }
  | { type: 'EXPIRE' }
  | { type: 'ERROR' };
