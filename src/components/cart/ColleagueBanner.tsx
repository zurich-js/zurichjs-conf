/**
 * Colleague Banner
 *
 * Shows social proof when a work email is detected at checkout.
 * Displays the number of colleagues from the same company already attending.
 */

import React, { useRef } from 'react';
import { Users } from 'lucide-react';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';

export interface ColleagueBannerProps {
  colleagueCount: number;
  companyName: string | null;
  domain: string;
  isLoading: boolean;
}

export const ColleagueBanner: React.FC<ColleagueBannerProps> = ({
  colleagueCount,
  companyName,
  domain,
  isLoading,
}) => {
  const hasTrackedShow = useRef(false);

  if (isLoading || colleagueCount === 0) return null;

  if (!hasTrackedShow.current) {
    hasTrackedShow.current = true;
    analytics.track('colleague_banner_shown', {
      domain,
      colleague_count: colleagueCount,
      company_name: companyName ?? undefined,
    } as EventProperties<'colleague_banner_shown'>);
  }

  const displayName = companyName || domain;
  const personWord = colleagueCount === 1 ? 'person' : 'people';

  const handleClick = (): void => {
    analytics.track('colleague_banner_clicked', {
      domain,
      colleague_count: colleagueCount,
      company_name: companyName ?? undefined,
    } as EventProperties<'colleague_banner_clicked'>);
  };

  return (
    <div
      role="status"
      className="mt-4 flex items-start gap-3 rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-4"
    >
      <Users className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-primary" aria-hidden="true" />
      <div className="text-sm">
        <p className="font-medium text-white">
          {colleagueCount} {personWord} from {displayName}{' '}
          {colleagueCount === 1 ? 'is' : 'are'} already attending!
        </p>
        <button
          onClick={handleClick}
          className="mt-1 text-brand-primary hover:text-brand-primary-light transition-colors focus:outline-none focus:underline"
        >
          Bring your whole team &rarr;
        </button>
      </div>
    </div>
  );
};
