/**
 * Easter Egg Analytics Events
 * Events related to the console-based easter egg reward system
 */

import type { BaseEventProperties } from './base';

export interface EasterEggShownEvent {
  event: 'easter_egg_shown';
  properties: BaseEventProperties;
}

export interface EasterEggRewardCalledEvent {
  event: 'easter_egg_reward_called';
  properties: BaseEventProperties;
}

export interface EasterEggAlreadyClaimedEvent {
  event: 'easter_egg_already_claimed';
  properties: BaseEventProperties;
}

export interface EasterEggClaimedEvent {
  event: 'easter_egg_claimed';
  properties: BaseEventProperties & {
    discount_code: string;
    percent_off: number;
    expires_at: string;
  };
}

export interface EasterEggClaimFailedEvent {
  event: 'easter_egg_claim_failed';
  properties: BaseEventProperties & {
    error: string;
  };
}
