import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export interface SponsorCardProps {
  /** Sponsor name (used for alt text) */
  name?: string;
  /** Grayscale / stripped logo — shown by default */
  logo?: string;
  /** Full-color logo — shown on hover. If omitted, `logo` is used with a CSS grayscale filter */
  colorLogo?: string;
  /** Link to sponsor website */
  url?: string | null;
  /** CTA href for empty state (default: /sponsorship) */
  ctaHref?: string;
}

export const SponsorCard: React.FC<SponsorCardProps> = ({
  name,
  logo,
  colorLogo,
  url,
  ctaHref = '/sponsorship',
}) => {
  const isEmpty = !logo;
  const hasExplicitColorLogo = !!colorLogo;
  const isSvgOrGif = logo?.endsWith('.svg') || logo?.endsWith('.gif');

  const baseClasses =
    'block w-full h-full rounded-2xl transition-all duration-300 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none';

  // --- Empty state: plus icon, white bg on hover ---
  if (isEmpty) {
    return (
      <Link
        href={ctaHref}
        className={`${baseClasses} bg-brand-gray-darkest hover:bg-brand-white grid place-items-center group`}
        aria-label="Learn about sponsorship opportunities"
      >
        <div
          className="w-12 h-12 rounded-full grid place-items-center transition-colors duration-300 border-2 text-brand-white/10 group-hover:text-brand-black/30 border-brand-white/10 group-hover:border-brand-black/30"
        >
          <Plus
            className="w-7 h-7 transition-colors duration-300 stroke-2"
            strokeWidth={2}
          />
        </div>
      </Link>
    );
  }

  // --- Filled state: grayscale → color on hover ---
  const content = (
    <div className="relative w-full h-full flex items-center justify-center group">
      {/* Default (grayscale) logo */}
      <Image
        src={logo}
        alt={name ? `${name} logo` : 'Sponsor logo'}
        fill
        className={`object-contain p-4 transition-opacity duration-300 ${
          hasExplicitColorLogo
            ? 'group-hover:opacity-0'
            : 'grayscale group-hover:grayscale-0'
        }`}
        unoptimized={isSvgOrGif}
      />
      {/* Color logo (only if explicitly provided) */}
      {hasExplicitColorLogo && (
        <Image
          src={colorLogo}
          alt={name ? `${name} logo` : 'Sponsor logo'}
          fill
          className="object-contain p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          unoptimized={colorLogo.endsWith('.svg') || colorLogo.endsWith('.gif')}
        />
      )}
    </div>
  );

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseClasses} bg-transparent hover:scale-[1.02] group`}
        aria-label={name ? `Visit ${name} website` : 'Visit sponsor website'}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={`${baseClasses} bg-transparent group`}>
      {content}
    </div>
  );
};
