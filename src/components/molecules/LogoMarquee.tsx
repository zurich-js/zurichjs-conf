import React from 'react';
import Image from 'next/image';

export interface LogoMarqueeItem {
  id: string;
  name: string;
  logo: string;
  website: string | null;
}

export interface LogoMarqueeProps {
  /** Array of logo items to display */
  logos: LogoMarqueeItem[];
  /** Animation speed in seconds (default: 30) */
  speed?: number;
  /** Pause animation on hover (default: true) */
  pauseOnHover?: boolean;
  /** Display logos in grayscale with color on hover (default: true) */
  grayscale?: boolean;
  /** Accessible label for the marquee */
  ariaLabel?: string;
}

/**
 * LogoMarquee - Infinite horizontal scrolling marquee for partner logos
 *
 * Features:
 * - Seamless infinite loop using CSS animation
 * - Grayscale with color on hover
 * - Pause on hover option
 * - Accessible with ARIA labels
 */
export const LogoMarquee: React.FC<LogoMarqueeProps> = ({
  logos,
  speed = 30,
  pauseOnHover = true,
  grayscale = true,
  ariaLabel = 'Community partners',
}) => {
  if (logos.length === 0) {
    return null;
  }

  // If few logos, center them instead of scrolling
  const shouldScroll = logos.length > 5;

  // Duplicate logos to create seamless loop (only needed for scrolling)
  const duplicatedLogos = shouldScroll ? [...logos, ...logos] : logos;

  const LogoItem = ({ item }: { item: LogoMarqueeItem }) => {
    const content = (
      <div
        className={`
          flex-shrink-0 w-[140px] h-[50px] mx-6 flex items-center justify-center
          transition-all duration-300
          ${grayscale ? 'grayscale hover:grayscale-0 opacity-60 hover:opacity-100' : ''}
        `}
      >
        <Image
          src={item.logo}
          alt={`${item.name} logo`}
          width={140}
          height={50}
          className="max-w-full max-h-full object-contain"
          unoptimized={item.logo.endsWith('.svg')}
        />
      </div>
    );

    if (item.website) {
      return (
        <a
          href={item.website}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Visit ${item.name} website`}
          className="focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none rounded"
        >
          {content}
        </a>
      );
    }

    return content;
  };

  // Centered layout for few logos
  if (!shouldScroll) {
    return (
      <div
        className="flex items-center justify-center"
        role="region"
        aria-label={ariaLabel}
      >
        {logos.map((item) => (
          <LogoItem key={item.id} item={item} />
        ))}
      </div>
    );
  }

  // Scrolling marquee for many logos
  return (
    <div
      className="relative overflow-hidden"
      role="region"
      aria-label={ariaLabel}
    >
      <div
        className={`flex items-center ${pauseOnHover ? 'hover:[animation-play-state:paused]' : ''}`}
        style={{
          animation: `marquee ${speed}s linear infinite`,
          width: 'max-content',
        }}
      >
        {duplicatedLogos.map((item, index) => (
          <LogoItem key={`${item.id}-${index}`} item={item} />
        ))}
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
};
