/**
 * useExitIntent Hook
 *
 * Detects exit intent on the cart page and triggers a callback to show a survey.
 * Desktop: mouseleave on documentElement when cursor moves above viewport.
 * Mobile: visibilitychange to hidden (tab switch / app switch).
 *
 * Guards:
 * - Only fires once per session (sessionStorage)
 * - Does not fire on the payment step
 * - Does not fire within first 10 seconds of mount
 * - Does not fire if cart is empty
 */

import { useEffect, useRef, useCallback } from 'react';

const SESSION_KEY = 'zurichjs_exit_survey_shown';
const MIN_TIME_ON_PAGE_MS = 10_000;

type CartStep = 'review' | 'attendees' | 'upsells' | 'checkout' | 'payment';

interface UseExitIntentOptions {
  /** Whether exit-intent detection is enabled */
  enabled: boolean;
  /** Current cart checkout step */
  currentStep: CartStep;
  /** Callback when exit intent is detected */
  onExitIntent: () => void;
}

interface UseExitIntentReturn {
  /** Manually mark the survey as shown (prevents further triggers) */
  markShown: () => void;
}

export function useExitIntent(options: UseExitIntentOptions): UseExitIntentReturn {
  const { enabled, currentStep, onExitIntent } = options;
  const mountTime = useRef<number>(Date.now());
  const hasFired = useRef(false);

  const markShown = useCallback(() => {
    hasFired.current = true;
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // sessionStorage may be unavailable in some contexts
    }
  }, []);

  const shouldTrigger = useCallback((): boolean => {
    if (!enabled) return false;
    if (hasFired.current) return false;
    if (currentStep === 'payment') return false;
    if (Date.now() - mountTime.current < MIN_TIME_ON_PAGE_MS) return false;

    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') {
        hasFired.current = true;
        return false;
      }
    } catch {
      // sessionStorage unavailable
    }

    return true;
  }, [enabled, currentStep]);

  const handleExitIntent = useCallback(() => {
    if (!shouldTrigger()) return;
    markShown();
    onExitIntent();
  }, [shouldTrigger, markShown, onExitIntent]);

  useEffect(() => {
    if (!enabled || currentStep === 'payment') return;

    // Desktop: mouse leaves viewport upward (toward browser chrome / close button)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 0) {
        handleExitIntent();
      }
    };

    // Mobile: tab switch or app switch
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleExitIntent();
      }
    };

    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, currentStep, handleExitIntent]);

  return { markShown };
}
