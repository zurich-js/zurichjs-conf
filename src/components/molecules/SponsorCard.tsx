import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CirclePlus } from 'lucide-react';
import {clsx} from "clsx";

export interface SponsorCardProps {
  /** Sponsor name (used for alt text) */
  name?: string;
  /** Grayscale / stripped logo — shown by default */
  logo?: string;
  /** Full-color logo — shown on hover. If omitted, `logo` is used with a CSS grayscale filter */
  logoColor?: string;
  /** Optional background color to reveal behind the color logo on hover */
  logoColorBackground?: string | null;
  /** Link to sponsor website */
  url?: string | null;
  /** CTA href for empty state (default: /sponsorship) */
  ctaHref?: string;
  isCta?: boolean
}

export const SponsorCard: React.FC<SponsorCardProps> = ({
  name,
  logo,
  logoColor,
  logoColorBackground,
  url,
  ctaHref = '/sponsorship',
  isCta
}) => {
  const isEmpty = !logo;
  const hasExplicitColorLogo = !!logoColor;
  const isSvgOrGif = logo?.endsWith('.svg') || logo?.endsWith('.gif');
  const isColorSvgOrGif = logoColor?.endsWith('.svg') || logoColor?.endsWith('.gif');

  const baseClasses =
    'block w-full h-full rounded-2xl transition-all duration-300 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none';

  // --- Empty state: plus icon, white bg on hover ---
  if (isEmpty) {
    return (
      <Link
        href={ctaHref}
        className={clsx(
            baseClasses,
            isCta ? 'bg-brand-gray-medium text-brand-gray-light  hover:bg-brand-orange hover:text-white' : 'bg-brand-gray-darkest hover:bg-brand-gray-lightest text-brand-white/10',
            `hover:text-brand-black/30 flex flex-col justify-center items-center group transition-colors duration-200`
        )}
        aria-label="Learn about sponsorship opportunities"
      >
          <CirclePlus
            className="w-7 h-7 stroke-2"
            strokeWidth={2}
          />
          {isCta && (
              <p className="mt-2 text-sm whitespace-nowrap font-bold transition-colors duration-200">Reach your dev audience</p>
          )}
      </Link>
    );
  }

  // --- Filled state: keep the base logo as-is, unless we need the grayscale fallback. ---
  const content = (
    <div
        className={clsx(
            'relative w-full h-full flex items-center justify-center rounded-2xl border-2 border-transparent',
            hasExplicitColorLogo && !logoColorBackground && 'group-hover:border-white',
        )}
    >
      {hasExplicitColorLogo && logoColorBackground && (
        <div
          className="absolute inset-0 opacity-0 rounded-2xl transition-opacity duration-500 ease-in-out group-hover:opacity-100"
          style={{ backgroundColor: logoColorBackground }}
          aria-hidden="true"
        />
      )}
      {/* Default (grayscale) logo */}
      <Image
        src={logo}
        alt={name ? `${name} logo` : 'Sponsor logo'}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
        className={`object-contain p-4 transition-all duration-500 ease-in-out ${
          hasExplicitColorLogo
            ? 'opacity-100 group-hover:opacity-0'
            : 'grayscale group-hover:grayscale-0'
        }`}
        unoptimized
      />
      {/* Color logo (only if explicitly provided) */}
      {hasExplicitColorLogo && (
        <Image
          src={logoColor}
          alt={name ? `${name} logo` : 'Sponsor logo'}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
          className="object-contain p-4 opacity-0 transition-all duration-500 ease-in-out group-hover:opacity-100"
          unoptimized
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
