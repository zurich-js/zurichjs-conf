import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Kicker } from '@/components/atoms/Kicker';
import { PhotoSwiper, type PhotoSlide } from '@/components/molecules';
import { SectionContainer } from '@/components/organisms/SectionContainer';
import { useMotion } from '@/contexts/MotionContext';

export interface Sponsor {
  id: string;
  name: string;
  logo: string;
  url: string;
  tier: 'platinum' | 'gold' | 'silver' | 'community';
  width: number;
  height: number;
}

export interface SponsorsSectionProps {
  kicker?: string;
  title: string;
  sponsors?: Sponsor[];
  photos?: PhotoSlide[];
}

/**
 * SponsorsSection - Organism component for displaying sponsors and photo gallery
 *
 * Features:
 * - Static sponsor logo grid with manual size control
 * - Horizontal scrolling photo gallery with manual masonry layouts
 * - Uses SectionContainer for consistent padding
 * - Photo gallery extends beyond right edge
 * - Accessibility compliant with ARIA labels
 *
 * @example
 * ```tsx
 * <SponsorsSection {...sponsorsData} />
 * ```
 */
export const SponsorsSection: React.FC<SponsorsSectionProps> = ({
  kicker = 'SPONSORS & PARTNERS',
  title,
  sponsors = [],
  photos = [],
}) => {
  const { shouldAnimate } = useMotion();

  return (
    <div className="">
      {/* Header Content */}
      <SectionContainer>
        <div className="text-center text-brand-gray-light">
          <Kicker animate delay={0.1}>
            {kicker}
          </Kicker>
          <p className="text-lg mt-4">
            {title}
          </p>
          <motion.p
            className="flex items-center gap-2 justify-center text-brand-gray-light text-lg"
            initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 0.6,
              delay: 0.5 + sponsors.length * 0.05,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            and the
            <Image
              src="/images/logo/zurichjs-full.svg"
              alt="ZurichJS Logo"
              height={32}
              width={110}
            />
            community
          </motion.p>
        </div>
      </SectionContainer>

      {/* Sponsor Logos - Static Grid */}
      {sponsors.length > 0 && (
        <SectionContainer>
          <div className="grid grid-cols-12 gap-4 md:gap-6" role="list" aria-label="Our sponsors">
            {sponsors.map((sponsor, index) => {
              const delay = shouldAnimate ? 0.4 + index * 0.05 : 0;
              // Map width to Tailwind col-span classes
              const colSpanClasses: Record<number, string> = {
                1: 'col-span-1',
                2: 'col-span-2',
                3: 'col-span-3',
                4: 'col-span-4',
                5: 'col-span-5',
                6: 'col-span-6',
                7: 'col-span-7',
                8: 'col-span-8',
                9: 'col-span-9',
                10: 'col-span-10',
                11: 'col-span-11',
                12: 'col-span-12',
              };
              const colSpan = colSpanClasses[sponsor.width] || 'col-span-3';

              return (
                <motion.div
                  key={sponsor.id}
                  className={colSpan}
                  role="listitem"
                  initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                  animate={shouldAnimate ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: 0.5,
                    delay,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <a
                    href={sponsor.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-[#242528] rounded-2xl p-6 transition-all duration-300 hover:bg-[#2A2A2D] hover:scale-105 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none"
                    style={{ height: `${sponsor.height}px` }}
                    aria-label={`Visit ${sponsor.name} website`}
                  >
                    <div className="relative w-full h-full">
                      <Image
                        src={sponsor.logo}
                        alt={`${sponsor.name} logo`}
                        fill
                        className="object-contain"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    </div>
                  </a>
                </motion.div>
              );
            })}
          </div>
        </SectionContainer>
      )}

      {/* Photo Gallery - Extends beyond right edge */}
      {photos.length > 0 && (
        <div className="relative mt-16 mb-8">
          {/* Use SectionContainer but cancel right padding to allow extension */}
          <div className="pl-4 sm:pl-12">
            <PhotoSwiper photos={photos} />
          </div>
        </div>
      )}


      {/* CTA */}
      <SectionContainer>
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
          animate={shouldAnimate ? { opacity: 1, y: 0 } : {}}
          transition={{
            duration: 0.6,
            delay: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <p className="text-brand-gray-light text-md text-center mb-4">
            Want to sponsor, partner, or volunteer?{' '}
            <a href="mailto:hello@zurichjs.com" className="text-md text-brand-blue hover:text-brand-gray-lightest duration-300 ease-in-out" target="_blank" rel="noopener noreferrer">
              Reach out to us
            </a>
          </p>
        </motion.div>
      </SectionContainer>
    </div>
  );
};
