/**
 * Easter Egg Client Module
 *
 * Registers the console message and window.conf global.
 * Only runs in the browser, never on the server.
 */

import { analytics } from '@/lib/analytics/client';
import type { ClaimResponse, ErrorResponse } from './types';

// Session storage key to track if already claimed
const CLAIMED_KEY = 'easter_egg_claimed';

// ASCII logo (clean, readable)
// const ASCII_LOGO = `
//
//   ███████╗██╗   ██╗██████╗ ██╗ ██████╗██╗  ██╗     ██╗███████╗
//   ╚══███╔╝██║   ██║██╔══██╗██║██╔════╝██║  ██║     ██║██╔════╝
//     ███╔╝ ██║   ██║██████╔╝██║██║     ███████║     ██║███████╗
//    ███╔╝  ██║   ██║██╔══██╗██║██║     ██╔══██║██   ██║╚════██║
//   ███████╗╚██████╔╝██║  ██║██║╚██████╗██║  ██║╚█████╔╝███████║
//   ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝╚═╝  ╚═╝ ╚════╝ ╚══════╝
//                      CONF 2026
// `;
// const background = 'background: url(data:image/png;base64,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)'
// const style = ["font-size:60px", "background-size:contain"]
// const styles = [background,...style].join(';')
// console.log(
//     '%c  ',
//     styles
// )

const GREETING_MESSAGE = `%c  \n%cOh hello there, fellow DevTools connoisseur.\n%cType %cconf.reward()%c and see what happens...
`;

const GREETING_STYLES = [
  'font-size:60px; background: url(data:image/png;base64,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); background-size:contain', // Logo - JS yellow
  'color: #4ade80; font-size: 13px; font-weight: bold;', // Greeting
  'color: #888; font-size: 12px;', // Message text
  'color: #f7df1e; font-weight: bold; font-size: 12px; background: #1a1a1a; padding: 2px 6px; border-radius: 3px;', // conf.reward()
  'color: #888; font-size: 12px;', // Rest of message
];

interface ConfGlobal {
  reward: () => Promise<string>;
  _initialized: boolean;
}

declare global {
  interface Window {
    conf: ConfGlobal;
  }
}

/**
 * Check if already claimed in this session
 */
function hasClaimedInSession(): boolean {
  try {
    return sessionStorage.getItem(CLAIMED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark as claimed in session
 */
function markClaimedInSession(): void {
  try {
    sessionStorage.setItem(CLAIMED_KEY, 'true');
  } catch {
    // Ignore storage errors
  }
}

/**
 * Claim the reward from server
 */
async function claimReward(): Promise<ClaimResponse> {
  const res = await fetch('/api/easter-egg/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ErrorResponse).error || 'Failed to claim reward');
  }
  return data as ClaimResponse;
}

/**
 * The main reward function - simple single call
 */
async function reward(): Promise<string> {
  // Track that reward was called
  analytics.track('easter_egg_reward_called', {});

  // Check if already claimed
  if (hasClaimedInSession()) {
    analytics.track('easter_egg_already_claimed', {});
    console.log(
      '%cEasy there, hacker! %cYou already grabbed your reward this session.\n' +
      'Check your promo code at checkout.',
      'color: #f7df1e; font-weight: bold;',
      'color: #888;'
    );
    return 'Already claimed this session!';
  }

  try {
    console.log('%c*hacking noises* ...', 'color: #888; font-style: italic;');
    const result = await claimReward();

    // Mark as claimed
    markClaimedInSession();

    // Track success
    analytics.track('easter_egg_claimed', {
      discount_code: result.code,
      percent_off: result.percentOff,
      expires_at: result.expiresAt,
    });

    // Show success message
    const minutes = Math.round((new Date(result.expiresAt).getTime() - Date.now()) / 60000);
    console.log(
      `\n%c  YOU FOUND THE SECRET!  \n\n` +
      `%c  Here's %c${result.percentOff}% off%c your ticket.\n\n` +
      `%c  Code: %c${result.code}\n\n` +
      `%c  Hurry! Expires in ${minutes} minutes.\n` +
      `  Paste it in the promo code field at checkout.\n\n` +
      `%c  See you at the conf!`,
      'background: #f7df1e; color: #000; font-weight: bold; font-size: 14px; padding: 4px 8px;',
      'color: #fff; font-size: 13px;',
      'color: #4ade80; font-weight: bold; font-size: 13px;',
      'color: #fff; font-size: 13px;',
      'color: #888;',
      'color: #f7df1e; font-weight: bold; font-size: 16px; background: #1a1a1a; padding: 4px 8px; border-radius: 4px;',
      'color: #888; font-size: 12px;',
      'color: #4ade80; font-style: italic;'
    );

    return `Your discount code is: ${result.code}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong';
    analytics.track('easter_egg_claim_failed', { error: message });
    console.log('%cOops! ' + message, 'color: #ef4444;');
    return `Error: ${message}`;
  }
}

/**
 * Initialize the easter egg
 * Call this once on client-side app mount
 */
export function initEasterEgg(): void {
  // Only run in browser
  if (typeof window === 'undefined') {
    return;
  }

  // Prevent double initialization
  if (window.conf?._initialized) {
    return;
  }

  // Check if feature is enabled (client-safe check)
  if (process.env.NEXT_PUBLIC_EASTER_EGG_ENABLED === 'false') {
    return;
  }

  // Print the greeting
  console.log(GREETING_MESSAGE, ...GREETING_STYLES);

  // Track that easter egg was shown
  analytics.track('easter_egg_shown', {});

  // Register the global
  window.conf = {
    reward,
    _initialized: true,
  };
}
