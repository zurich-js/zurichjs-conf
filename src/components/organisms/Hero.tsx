import React from 'react';
import { motion } from 'framer-motion';
import { Logo, Heading, Kicker, IconButton } from '@/components/atoms';
import { Countdown, BackgroundMedia, SpeakerCardProps } from '@/components/molecules';
import { useMotion } from '@/contexts/MotionContext';
import { ShapedSection } from './ShapedSection';
import { ArrowRight } from 'lucide-react';
import {SectionContainer} from "@/components/organisms/SectionContainer";

export interface HeroProps {
  title: string;
  kicker: string;
  dateTimeISO: string;
  venue: string;
  city: string;
  ctaLabel: string;
  onCtaClick?: () => void;
  speakers: SpeakerCardProps[];
  background: {
    videoSrc?: string;
    posterSrc?: string;
    imgFallbackSrc?: string;
  };
}

/**
 * Hero organism component
 * Full-featured conference hero section with:
 * - Video background with overlay
 * - Animated title and metadata
 * - Live countdown timer
 * - CTA buttons
 * - Speaker showcase on diagonal divider
 */
export const Hero: React.FC<HeroProps> = ({
  title,
  kicker,
  dateTimeISO,
  venue,
  city,
  ctaLabel,
  onCtaClick,
  background,
}) => {
  const { shouldAnimate } = useMotion();

  // Format the date for display
  const eventDate = new Date(dateTimeISO);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <ShapedSection shape="tighten" variant="dark" dropTop disableContainer>
        {/* Background Video/Image with Overlay */}
        <BackgroundMedia
          videoSrc={background.videoSrc}
          posterSrc={background.posterSrc}
          imgFallbackSrc={background.imgFallbackSrc}
          overlayOpacity={0.7}
          fadeOut={true}
        />
      <SectionContainer>
        {/* Logo */}
        <div className="relative z-10 my-20">
          <Logo width={180} height={48} />
        </div>

        {/* Main Content Area */}
        <div className="relative z-10 flex flex-col">
          <div className="space-y-3">
            {/* Kicker */}
            <Kicker animate={shouldAnimate} delay={0.1} className="text-base md:text-md text-brand-white font-semibold">
              {kicker}
            </Kicker>

            {/* Title */}
            <Heading
              level="h1"
              animate={shouldAnimate}
              delay={0.2}
              className="text-2xl xs:text-3xl xl:text-4xl leading-tight mb-4 md:mb-6 lg:mb-8"
            >
              {title}
            </Heading>
          </div>

          <div className="flex flex-col lg:flex-row lg:justify-between lg:w-full gap-4 md:gap-8">
            {/* Date, Location, and Button Container */}
            <motion.div
              className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8"
              initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
              animate={shouldAnimate ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: 0.3,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {/* Date and Location */}
              <div className="space-y-1">
                <p className="text-md text-brand-white">
                  {formattedDate}
                </p>
                <p className="text-base text-brand-gray-light">
                  {venue}, {city}
                </p>
              </div>

              {/* Render Ticket Button */}
              <IconButton
                onClick={onCtaClick}
                icon={
                  <div className="relative w-14 h-14">
                    {/* Outer ring */}
                    <div className="absolute inset-0 rounded-full border border-brand-gray-light" />
                    {/* Inner filled circle */}
                    <div className="absolute inset-3 rounded-full bg-brand-yellow-main flex items-center justify-center">
                      <ArrowRight size={16} strokeWidth={2} className="text-black" />
                    </div>
                  </div>
                }
              >
                {ctaLabel}
              </IconButton>
            </motion.div>

            <div className="lg:shrink-0 lg:pb-2 xl:scale-110 2xl:scale-125 xl:mr-4 2xl:mr-8">
              <Countdown targetDate={dateTimeISO} />
            </div>
          </div>
        </div>

      </SectionContainer>
    </ShapedSection>
  );
};

