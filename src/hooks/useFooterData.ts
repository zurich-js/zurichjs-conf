/**
 * Dynamic Footer Data Hook
 *
 * Provides footer data with feature-flag-aware link states.
 * Currently returns static footer data, but can be extended for future feature flags.
 */

import { footerData } from '@/data/footer';
import type { SiteFooterProps } from '@/components/organisms/SiteFooter';

/**
 * Hook to get footer data with dynamic link states based on feature flags
 *
 * @example
 * const footerData = useFooterData();
 * <SiteFooter {...footerData} />
 */
export function useFooterData(): SiteFooterProps {
  return footerData;
}

export default useFooterData;
