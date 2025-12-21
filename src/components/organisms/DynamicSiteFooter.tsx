/**
 * Dynamic Site Footer
 *
 * A wrapper around SiteFooter that automatically handles feature-flag-aware
 * link states. Use this instead of SiteFooter when you need dynamic link visibility.
 */

import React from 'react';
import { SiteFooter } from '@/components/organisms/SiteFooter';
import { useFooterData } from '@/hooks/useFooterData';

/**
 * DynamicSiteFooter component
 *
 * Renders the site footer with dynamic link states based on feature flags.
 * Links like CFP are automatically unlocked when their feature flags are enabled.
 *
 * @example
 * // Instead of:
 * <SiteFooter {...footerData} />
 *
 * // Use:
 * <DynamicSiteFooter />
 */
export function DynamicSiteFooter() {
  const footerData = useFooterData();
  return <SiteFooter {...footerData} />;
}

export default DynamicSiteFooter;
