/**
 * Tech Stack Detector
 *
 * Detects visitor's frontend tech stack based on their installed browser
 * DevTools extensions. This tells us what frameworks/tools the VISITOR uses,
 * not what the website is built with.
 *
 * @module techStackDetector
 *
 * @example
 * // Initialize on app start (typically in _app.tsx)
 * import { initTechStackDetection } from '@/lib/analytics/techStackDetector';
 *
 * // In useEffect after PostHog init:
 * initTechStackDetection();
 *
 * @example
 * // Manual detection (for testing)
 * import { detectTechStack } from '@/lib/analytics/techStackDetector';
 *
 * const traits = await detectTechStack();
 * console.log(traits);
 * // {
 * //   framework_primary: 'react',  // Has React DevTools installed
 * //   state_management: ['redux'], // Has Redux DevTools installed
 * //   data_layer: ['apollo'],      // Has Apollo DevTools installed
 * //   confidence: 'high',
 * //   version: '1.1.0'
 * // }
 */

import { detect } from './scoring';
import {
  allowNextDetection,
  hasTraitsChanged,
  markDetectionComplete,
  resetDetectionState,
  shouldSkipDetection,
} from './dedupe';
import type { TechStackTraits } from './types';
import { sendTechTraitsToPosthog } from './posthog';

// Re-export types for consumers
export type {
  TechStackTraits,
  InitTechStackDetectionOptions,
  FrameworkPrimary,
  StateTool,
  DataTool,
  DetectionConfidence,
  Signal,
  DetectionContext,
} from './types';

export { DETECTOR_VERSION, SESSION_STORAGE_KEY } from './types';


/** Check if we're in production */
function isProduction(): boolean {
  if (typeof process !== 'undefined') {
    return process.env?.NODE_ENV === 'production';
  }
  return true; // Assume production if we can't tell
}

/** Log only in debug mode */
function debugLog(debug: boolean, ...args: unknown[]): void {
  if (debug && typeof console !== 'undefined') {
    console.log('[TechStackDetector]', ...args);
  }
}

/**
 * Detects the user's tech stack from browser environment.
 *
 * This function is safe to call multiple times - it will use cached results
 * if detection has already run this session (unless force is true).
 *
 * @param ctx - Optional context for testing/force scenarios
 * @returns Promise resolving to detected tech stack traits
 *
 * @example
 * // Basic usage
 * const traits = await detectTechStack();
 *
 * @example
 * // Force new detection (ignores session cache)
 * const traits = await detectTechStack({ force: true });
 */
export async function detectTechStack(
  ctx?: { force?: boolean }
): Promise<TechStackTraits> {
  const isProd = isProduction();
  const debug = !isProd;

  // Handle force mode
  if (ctx?.force) {
    allowNextDetection();
  }

  // Check if already detected
  if (shouldSkipDetection()) {
    debugLog(debug, 'Skipping - already detected this session');
    // Return a minimal unknown result
    return {
      framework_primary: 'unknown',
      state_management: [],
      data_layer: [],
      confidence: 'none',
      version: (await import('./types')).DETECTOR_VERSION,
    };
  }

  debugLog(debug, 'Starting detection...');

  const traits = await detect({
    isProduction: isProd,
    debug,
  });

  // Mark as complete and cache
  markDetectionComplete(traits);

  debugLog(debug, 'Detection complete:', traits);

  return traits;
}

/**
 * Schedules detection to run after page load/idle.
 *
 * @param callback - Function to call when ready to detect
 */
function scheduleAfterIdle(callback: () => void): void {
  if (typeof window === 'undefined') {
    return;
  }

  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback(callback, { timeout: 3000 });
  } else {
    // Fallback for Safari and older browsers
    setTimeout(callback, 1500);
  }
}

/**
 * Initializes tech stack detection.
 *
 * Call this once after PostHog is initialized (typically in _app.tsx useEffect).
 * Detection will run after page load/idle to avoid impacting performance.
 *
 * @param opts - Initialization options
 *
 * @example
 * // In _app.tsx useEffect, after PostHog init:
 * initTechStackDetection();
 *
 * @example
 * // Force re-detection (for testing):
 * initTechStackDetection({ force: true });
 */
export function initTechStackDetection(
  opts: { force?: boolean; debug?: boolean } = {}
): void {
  // SSR guard
  if (typeof window === 'undefined') {
    return;
  }

  const force = opts.force ?? false;
  const debug = opts.debug ?? !isProduction();

  debugLog(debug, 'Init called', { force });

  // Check if already scheduled
  if (shouldSkipDetection() && !force) {
    debugLog(debug, 'Skipping init - already detected this session');
    return;
  }

  // Schedule detection after page load
  scheduleAfterIdle(async () => {
    try {
      debugLog(debug, 'Running scheduled detection...');

      const traits = await detectTechStack({ force });

      // Check if traits have changed (for force mode)
      if (force && !hasTraitsChanged(traits)) {
        debugLog(debug, 'Traits unchanged, skipping PostHog update');
        return;
      }

      // Send to PostHog
      sendTechTraitsToPosthog(traits, debug);
    } catch (error) {
      // Never throw from detection - fail silently
      debugLog(debug, 'Detection error (suppressed):', error);
    }
  });
}

/**
 * Resets detection state. Only for testing.
 *
 * @example
 * // In tests:
 * import { __testing } from '@/lib/analytics/techStackDetector';
 * __testing.resetState();
 */
export const __testing = {
  resetState: resetDetectionState,
  allowNextDetection,
  isProduction,
};
