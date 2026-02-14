/**
 * Easter Egg Client Module
 *
 * Registers the console message and window.conf global.
 * Only runs in the browser, never on the server.
 */

import type { ClaimResponse, ErrorResponse } from './types';

// Session storage key to track if already claimed
const CLAIMED_KEY = 'easter_egg_claimed';

// ASCII logo (clean, readable)
const ASCII_LOGO = `

  ███████╗██╗   ██╗██████╗ ██╗ ██████╗██╗  ██╗     ██╗███████╗
  ╚══███╔╝██║   ██║██╔══██╗██║██╔════╝██║  ██║     ██║██╔════╝
    ███╔╝ ██║   ██║██████╔╝██║██║     ███████║     ██║███████╗
   ███╔╝  ██║   ██║██╔══██╗██║██║     ██╔══██║██   ██║╚════██║
  ███████╗╚██████╔╝██║  ██║██║╚██████╗██║  ██║╚█████╔╝███████║
  ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝╚═╝  ╚═╝ ╚════╝ ╚══════╝
                     CONF 2026
`;

const GREETING_MESSAGE = `%c${ASCII_LOGO}
%cOh hello there, fellow DevTools connoisseur.
%cType %cconf.reward()%c and see what happens...
`;

const GREETING_STYLES = [
  'color: #f7df1e; font-family: monospace; font-size: 11px; line-height: 1.2;', // Logo - JS yellow
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
  // Check if already claimed
  if (hasClaimedInSession()) {
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

  // Register the global
  window.conf = {
    reward,
    _initialized: true,
  };
}
