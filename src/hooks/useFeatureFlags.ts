/**
 * Feature Flag Hooks
 *
 * Provides React hooks for checking PostHog feature flags using TanStack Query.
 */

import { useQuery } from '@tanstack/react-query';
import posthog from 'posthog-js';

/**
 * Available feature flags
 */
export type FeatureFlag = 'cfp' | 'workshops' | 'schedule' | 'speakers' | 'venue';

/**
 * Fetches feature flag status from PostHog
 * Returns a promise that resolves once flags are loaded
 */
function fetchFeatureFlag(flag: FeatureFlag): Promise<boolean> {
  // Server-side: always return false
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  // Check if flag is already available
  const currentValue = posthog.isFeatureEnabled(flag);
  if (currentValue !== undefined) {
    return Promise.resolve(currentValue);
  }

  // Wait for feature flags to load
  return new Promise((resolve) => {
    posthog.onFeatureFlags(() => {
      resolve(posthog.isFeatureEnabled(flag) ?? false);
    });
  });
}

/**
 * Hook to check if a specific feature flag is enabled
 */
export function useFeatureFlag(flag: FeatureFlag) {
  const { data: isEnabled = false, isLoading } = useQuery({
    queryKey: ['featureFlag', flag],
    queryFn: () => fetchFeatureFlag(flag),
    staleTime: Infinity, // Feature flags don't change during a session
    gcTime: Infinity,
    retry: false,
  });

  return { isEnabled, isLoading };
}

/**
 * Hook to check if the CFP feature is enabled
 */
export function useCfpFeatureFlag() {
  const { isEnabled, isLoading } = useFeatureFlag('cfp');
  return { isCfpEnabled: isEnabled, isLoading };
}

/**
 * Utility function to check feature flag (non-hook version)
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  if (typeof window === 'undefined') return false;
  return posthog.isFeatureEnabled(flag) ?? false;
}
