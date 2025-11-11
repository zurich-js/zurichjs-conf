import React from 'react';
import { motion } from 'framer-motion';
import { Logo, Heading, Kicker, IconButton } from '@/components/atoms';
import { Countdown, BackgroundMedia, SpeakerCardProps } from '@/components/molecules';
import { useMotion } from '@/contexts/MotionContext';
import { ShapedSection } from './ShapedSection';
import Image from 'next/image';
import RightArrowCircle from '@/../public/icons/right-arrow-circle.svg';
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
        <div className="relative z-10 mb-20">
          <Logo width={180} height={48} />
        </div>

        {/* Main Content Area */}
        <div className="relative z-10 flex-1 flex items-end">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-12 xl:gap-16 2xl:gap-20">
              {/* Left Content */}
              <div className="space-y-3 flex-1 max-w-3xl">
                {/* Kicker */}
                <Kicker animate={shouldAnimate} delay={0.1}>
                  {kicker}
                </Kicker>

                {/* Title */}
                <Heading
                  level="h1"
                  animate={shouldAnimate}
                  delay={0.2}
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-tight"
                >
                  {title}
                </Heading>

                {/* Date, Location, and Button Container */}
                <motion.div
                  className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 md:gap-8 pt-2"
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
                    <p className="text-base md:text-lg xl:text-xl text-white/90">
                      {formattedDate}
                    </p>
                    <p className="text-base md:text-lg xl:text-xl text-text-muted">
                      {venue}, {city}
                    </p>
                  </div>

                  {/* Render Ticket Button */}
                  <IconButton
                    onClick={onCtaClick}
                    icon={
                      <Image
                        src={RightArrowCircle}
                        alt="Arrow icon"
                        width={56}
                        height={56}
                        className="w-full h-full"
                      />
                    }
                  >
                    {ctaLabel}
                  </IconButton>
                </motion.div>
              </div>

              {/* Right Content - Countdown */}
              <div className="lg:shrink-0 lg:pb-2 xl:scale-110 2xl:scale-125 xl:mr-4 2xl:mr-8">
                <Countdown targetDate={dateTimeISO} />
              </div>
          </div>
        </div>

      </SectionContainer>

        {/*<div className="relative z-10 mt-auto">*/}
        {/*  <SpeakerGrid speakers={speakers} />*/}
        {/*</div>*/}
    </ShapedSection>
  );
};

