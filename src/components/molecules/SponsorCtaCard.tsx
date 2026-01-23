import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export interface SponsorCtaCardProps {
  /** Link destination (default: /sponsorship) */
  href?: string;
  /** CTA text (default: "Reach your dev audience") */
  text?: string;
}

/**
 * SponsorCtaCard - White CTA card encouraging sponsorship
 *
 * Features:
 * - Clean white background that stands out
 * - Plus icon indicating "add/join"
 * - Links to sponsorship info page
 * - Hover effects for interactivity
 */
export const SponsorCtaCard: React.FC<SponsorCtaCardProps> = ({
  href = '/sponsorship',
  text = 'Reach your dev audience',
}) => {
  return (
    <Link
      href={href}
      className="
        block w-full h-[180px] sm:h-[200px] md:h-[220px] lg:w-[320px] lg:h-[240px] rounded-2xl bg-white
        p-4 flex flex-col items-center justify-center gap-3
        transition-all duration-300
        hover:bg-gray-50 hover:scale-[1.02]
        focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none
        group
      "
      aria-label="Learn about sponsorship opportunities"
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'rgba(124, 126, 137, 0.2)' }}
      >
        <Plus
          className="w-8 h-8"
          style={{ color: '#7C7E89' }}
          strokeWidth={2}
        />
      </div>
      <span className="text-sm text-black text-center font-medium leading-tight">
        {text}
      </span>
    </Link>
  );
};
