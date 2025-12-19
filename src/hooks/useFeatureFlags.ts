/**
 * Feature Flag Hooks
 *
 * Provides React hooks for checking PostHog feature flags.
 * Use these hooks to conditionally render features based on feature flag status.
 */

import { useEffect, useState } from 'react';
import posthog from 'posthog-js';

/**
 * Available feature flags
 */
export type FeatureFlag = 'cfp' | 'workshops' | 'schedule' | 'speakers' | 'venue';

interface FeatureFlagState {
  isEnabled: boolean;
  isLoading: boolean;
}

/**
 * Hook to check if a specific feature flag is enabled
 *
 * @example
 * const { isEnabled, isLoading } = useFeatureFlag('cfp');
 * if (isLoading) return <Loading />;
 * if (!isEnabled) return <NotAvailable />;
 */
export function useFeatureFlag(flag: FeatureFlag): FeatureFlagState {
  const [state, setState] = useState<FeatureFlagState>({
    isEnabled: false,
    isLoading: true,
  });

  useEffect(() => {
    // Skip on server side
    if (typeof window === 'undefined') {
      return;
    }

    // Function to check the flag
    const checkFlag = () => {
      try {
        const isEnabled = posthog.isFeatureEnabled(flag) ?? false;
        setState({ isEnabled, isLoading: false });
      } catch {
        // PostHog not ready yet
        setState({ isEnabled: false, isLoading: false });
      }
    };

    // Check if PostHog is already loaded
    if (posthog.__loaded) {
      // Use onFeatureFlags to ensure flags are loaded
      posthog.onFeatureFlags(() => {
        checkFlag();
      });
    } else {
      // Wait for PostHog to load
      const checkInterval = setInterval(() => {
        if (posthog.__loaded) {
          clearInterval(checkInterval);
          posthog.onFeatureFlags(() => {
            checkFlag();
          });
        }
      }, 100);

      // Cleanup after 5 seconds if not loaded
      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        setState({ isEnabled: false, isLoading: false });
      }, 5000);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }
  }, [flag]);

  return state;
}

/**
 * Hook to check if the CFP feature is enabled
 *
 * @example
 * const { isCfpEnabled, isLoading } = useCfpFeatureFlag();
 */
export function useCfpFeatureFlag() {
  const { isEnabled, isLoading } = useFeatureFlag('cfp');
  return { isCfpEnabled: isEnabled, isLoading };
}

/**
 * Hook to get multiple feature flags at once
 *
 * @example
 * const flags = useFeatureFlags(['cfp', 'workshops']);
 * if (flags.cfp.isEnabled) { ... }
 */
export function useFeatureFlags(flags: FeatureFlag[]): Record<FeatureFlag, FeatureFlagState> {
  const [state, setState] = useState<Record<FeatureFlag, FeatureFlagState>>(() => {
    const initial: Record<string, FeatureFlagState> = {};
    flags.forEach((flag) => {
      initial[flag] = { isEnabled: false, isLoading: true };
    });
    return initial as Record<FeatureFlag, FeatureFlagState>;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const checkFlags = () => {
      const newState: Record<string, FeatureFlagState> = {};
      flags.forEach((flag) => {
        try {
          newState[flag] = {
            isEnabled: posthog.isFeatureEnabled(flag) ?? false,
            isLoading: false,
          };
        } catch {
          newState[flag] = { isEnabled: false, isLoading: false };
        }
      });
      setState(newState as Record<FeatureFlag, FeatureFlagState>);
    };

    if (posthog.__loaded) {
      posthog.onFeatureFlags(() => {
        checkFlags();
      });
    } else {
      const checkInterval = setInterval(() => {
        if (posthog.__loaded) {
          clearInterval(checkInterval);
          posthog.onFeatureFlags(() => {
            checkFlags();
          });
        }
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        const newState: Record<string, FeatureFlagState> = {};
        flags.forEach((flag) => {
          newState[flag] = { isEnabled: false, isLoading: false };
        });
        setState(newState as Record<FeatureFlag, FeatureFlagState>);
      }, 5000);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }
  }, [flags.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}

/**
 * Utility function to check feature flag (non-hook version)
 * Use this when you can't use hooks (e.g., in event handlers)
 *
 * @example
 * if (isFeatureEnabled('cfp')) { ... }
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return posthog.isFeatureEnabled(flag) ?? false;
  } catch {
    return false;
  }
}

/**
 * Wait for feature flags to be loaded, then check
 * Returns a promise that resolves to the flag status
 *
 * @example
 * const isEnabled = await waitForFeatureFlag('cfp');
 */
export function waitForFeatureFlag(flag: FeatureFlag): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    const check = () => {
      if (posthog.__loaded) {
        posthog.onFeatureFlags(() => {
          try {
            resolve(posthog.isFeatureEnabled(flag) ?? false);
          } catch {
            resolve(false);
          }
        });
      } else {
        // Wait and retry
        setTimeout(check, 100);
      }
    };

    check();

    // Timeout after 5 seconds
    setTimeout(() => {
      resolve(false);
    }, 5000);
  });
}
