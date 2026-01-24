import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { PublicSponsor } from '@/lib/types/sponsorship';

export interface SponsorCardProps {
  /** Sponsor data (or null for placeholder) */
  sponsor: PublicSponsor | null;
  /** Card size variant */
  size: 'large' | 'medium' | 'small';
  /** Show placeholder styling when no sponsor */
  placeholder?: boolean;
}

/**
 * SponsorCard - Card component for displaying sponsor logos
 *
 * Features:
 * - Two size variants: large (featured) and small
 * - Dark background with hover effects
 * - Placeholder state with grey plus icon (links to sponsorship page)
 * - Accessible with proper ARIA labels
 */
export const SponsorCard: React.FC<SponsorCardProps> = ({
  sponsor,
  size,
  placeholder = false,
}) => {
  const isPlaceholder = !sponsor || placeholder;

  // Responsive sizes for different breakpoints
  // Large: 320px, Medium: ~152px each, Small: 110px square
  const sizeClasses = {
    large: 'w-full h-[180px] sm:h-[200px] md:h-[220px] lg:w-[320px] lg:h-[240px]',
    medium: 'w-full aspect-square sm:aspect-auto sm:h-[100px] md:h-[110px]',
    small: 'w-[110px] h-[110px] shrink-0',
  }[size];

  const baseClasses = `
    block rounded-2xl transition-all duration-300
    focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none
    ${sizeClasses}
  `;

  if (isPlaceholder) {
    const iconSize = {
      large: 'w-10 h-10',
      medium: 'w-6 h-6',
      small: 'w-5 h-5',
    }[size];
    const circleSize = {
      large: 'w-16 h-16',
      medium: 'w-10 h-10',
      small: 'w-8 h-8',
    }[size];

    return (
      <Link
        href="/sponsorship"
        className={`${baseClasses} bg-[#242528] flex items-center justify-center hover:bg-surface-card-hover hover:scale-[1.02]`}
        aria-label="Learn about sponsorship opportunities"
      >
        <div
          className={`${circleSize} rounded-full flex items-center justify-center`}
          style={{ backgroundColor: 'rgba(124, 126, 137, 0.2)' }}
        >
          <Plus
            className={iconSize}
            style={{ color: '#7C7E89' }}
            strokeWidth={2}
          />
        </div>
      </Link>
    );
  }

  const content = (
    <div className="relative w-full h-full p-4 md:p-6 flex items-center justify-center">
      <Image
        src={sponsor.logo}
        alt={`${sponsor.name} logo`}
        fill
        className="object-contain p-4"
        sizes={size === 'large' ? '(max-width: 768px) 50vw, 33vw' : '(max-width: 768px) 25vw, 15vw'}
        unoptimized={sponsor.logo.endsWith('.svg')}
      />
    </div>
  );

  if (sponsor.url) {
    return (
      <a
        href={sponsor.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseClasses} bg-[#242528] hover:bg-surface-card-hover hover:scale-[1.02]`}
        aria-label={`Visit ${sponsor.name} website`}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={`${baseClasses} bg-[#242528]`}>
      {content}
    </div>
  );
};
