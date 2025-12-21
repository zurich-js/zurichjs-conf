/**
 * Dynamic Footer Data Hook
 *
 * Provides footer data with feature-flag-aware link states.
 * Links like CFP are unlocked when their respective feature flags are enabled.
 */

import { useMemo } from 'react';
import { footerData } from '@/data/footer';
import { useCfpFeatureFlag } from '@/hooks/useFeatureFlags';
import type { SiteFooterProps } from '@/components/organisms/SiteFooter';

/**
 * Hook to get footer data with dynamic link states based on feature flags
 *
 * @example
 * const footerData = useFooterData();
 * <SiteFooter {...footerData} />
 */
export function useFooterData(): SiteFooterProps {
  const { isCfpEnabled } = useCfpFeatureFlag();

  return useMemo(() => {
    // Create a copy of the footer data with updated link states
    const dynamicFooterData: SiteFooterProps = {
      ...footerData,
      conference: {
        ...footerData.conference,
        links: footerData.conference.links.map((link) => {
          // Unlock CFP link when feature flag is enabled
          if (link.href === '/cfp') {
            return {
              ...link,
              locked: !isCfpEnabled,
            };
          }
          return link;
        }),
      },
    };

    return dynamicFooterData;
  }, [isCfpEnabled]);
}

export default useFooterData;
