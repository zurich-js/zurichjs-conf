/**
 * Speakers Section
 * Displays featured speakers with clean, simple cards
 * Always horizontally scrollable on all screen sizes
 */

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/atoms';
import { publicSpeakersQueryOptions } from '@/lib/queries/speakers';
import { trackButtonClick } from '@/lib/analytics';
import type { PublicSpeaker } from '@/lib/types/cfp';

export interface SpeakersSectionProps {
  className?: string;
}

interface SpeakerCardProps {
  name: string;
  title: string;
  avatarUrl: string;
  href: string;
}

function SpeakerCard({ name, title, avatarUrl, href }: SpeakerCardProps) {
  const hasTextContent = name.trim() || title.trim();

  return (
    <Link
      href={href}
      aria-label={name ? `View ${name}'s speaker profile` : 'View speaker profile'}
      className="group relative flex-shrink-0 w-[240px] sm:w-[220px] md:w-[240px] lg:w-[230px] xl:w-[260px] rounded-2xl transition-all duration-300 ease-out hover:z-10 hover:mx-2 hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2 focus-visible:ring-offset-brand-white"
    >
      <div className="relative rounded-2xl overflow-hidden bg-brand-primary">
        {/* Image container */}
        <div className="aspect-[3/4] relative">
          {avatarUrl && (
            <Image
              src={avatarUrl}
              alt={name ? `${name} avatar` : 'Speaker avatar'}
              fill
              className="object-cover object-top"
              sizes="(max-width: 640px) 240px, (max-width: 768px) 220px, (max-width: 1024px) 240px, (max-width: 1280px) 230px, 260px"
              draggable={false}
            />
          )}
          {/* Gradient overlay for text readability - only show when there's text content */}
          {hasTextContent && (
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black via-black/80 to-transparent" />
          )}
        </div>

        {/* Text content - only show when name or title exists */}
        {hasTextContent && (
          <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
            {name.trim() && <h3 className="text-white font-bold text-base leading-tight mb-1">{name}</h3>}
            {title.trim() && <p className="text-brand-primary text-sm opacity-90 leading-tight line-clamp-2 min-h-[2.5em]">{title}</p>}
          </div>
        )}
      </div>
    </Link>
  );
}

function SpeakerCardSkeleton() {
  return (
    <div
      className="flex-shrink-0 w-[240px] sm:w-[220px] md:w-[240px] lg:w-[230px] xl:w-[260px] rounded-2xl"
      aria-hidden="true"
    >
      <div className="relative rounded-2xl overflow-hidden bg-brand-primary">
        <div className="aspect-[3/4] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-primary via-[#f7ec96] to-[#d9c856]" />
          <div className="absolute inset-0 animate-pulse bg-white/20" />
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/80 via-black/45 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="mx-auto mb-2 h-4 w-28 rounded-full bg-white/80" />
          <div className="mx-auto h-3 w-36 rounded-full bg-white/45" />
        </div>
      </div>
    </div>
  );
}

function SpeakerCardsSkeleton() {
  return (
    <div className="w-full" aria-label="Loading featured speakers">
      <div className="overflow-x-auto overscroll-x-contain scrollbar-hide">
        <div className="flex gap-4 md:gap-6 p-4 w-max min-w-full justify-start lg:justify-center">
          {Array.from({ length: 5 }).map((_, index) => (
            <SpeakerCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface SpeakerMarqueeCardProps {
  speaker: PublicSpeaker;
}

function getSpeakerName(speaker: PublicSpeaker) {
  return [speaker.first_name, speaker.last_name].filter(Boolean).join(' ');
}

function getSpeakerTitle(speaker: PublicSpeaker) {
  return [speaker.job_title, speaker.company].filter(Boolean).join(' @ ');
}

function SpeakerMarqueeCard({ speaker }: SpeakerMarqueeCardProps) {
  const fullName = getSpeakerName(speaker);
  const titleWithCompany = getSpeakerTitle(speaker);

  return (
    <Link
      href={`/speakers/${speaker.slug}`}
      aria-label={fullName ? `View ${fullName}'s speaker profile` : 'View speaker profile'}
      className="group/card relative flex w-[142px] flex-shrink-0 overflow-hidden rounded-lg bg-brand-white shadow-sm transition-transform duration-500 ease-out hover:z-10 hover:-translate-y-1.5 hover:scale-[1.04] hover:shadow-md focus-visible:z-10 focus-visible:-translate-y-1.5 focus-visible:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2 focus-visible:ring-offset-brand-white sm:w-[156px]"
    >
      <div className="relative aspect-[5/6] w-full bg-brand-gray-lightest">
        {speaker.profile_image_url && (
          <Image
            src={speaker.profile_image_url}
            alt={fullName ? `${fullName} avatar` : 'Speaker avatar'}
            fill
            className="object-cover object-top"
            sizes="156px"
            draggable={false}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-3 pb-3 pt-12 transition-all duration-300 group-hover/card:pt-16 group-focus-visible/card:pt-16">
          {fullName && <h3 className="text-xs font-bold leading-tight text-white">{fullName}</h3>}
          {titleWithCompany && (
            <p className="mt-1 max-h-0 overflow-hidden text-[11px] leading-tight text-brand-primary opacity-0 transition-all duration-300 group-hover/card:max-h-8 group-hover/card:opacity-100 group-focus-visible/card:max-h-8 group-focus-visible/card:opacity-100">
              {titleWithCompany}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

interface SpeakerMarqueeProps {
  speakers: PublicSpeaker[];
}

function useSmoothMarquee(isPaused: boolean) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(isPaused);
  const speedRef = useRef(18);
  const scrollPositionRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const contentWidthRef = useRef(0);
  const isAutoScrollingRef = useRef(false);
  const manualPauseUntilRef = useRef(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) {
      return undefined;
    }

    let isResetting = false;
    let clearAutoScrollFrame = 0;

    const pauseForManualInteraction = () => {
      manualPauseUntilRef.current = performance.now() + 1400;
      isAutoScrollingRef.current = false;
      speedRef.current = 0;
      scrollPositionRef.current = viewport.scrollLeft;
    };

    const normalizeScrollPosition = (syncFromViewport: boolean) => {
      const contentWidth = contentWidthRef.current;
      if (contentWidth <= 0 || isResetting) {
        return;
      }

      if (syncFromViewport) {
        scrollPositionRef.current = viewport.scrollLeft;
      }

      const lowerBound = contentWidth * 0.5;
      const upperBound = contentWidth * 1.5;

      if (scrollPositionRef.current < lowerBound) {
        isResetting = true;
        scrollPositionRef.current += contentWidth;
        viewport.scrollLeft = scrollPositionRef.current;
        isResetting = false;
      } else if (scrollPositionRef.current > upperBound) {
        isResetting = true;
        scrollPositionRef.current -= contentWidth;
        viewport.scrollLeft = scrollPositionRef.current;
        isResetting = false;
      }
    };

    const handleScroll = () => {
      if (isAutoScrollingRef.current) {
        return;
      }

      if (Math.abs(viewport.scrollLeft - scrollPositionRef.current) < 2) {
        return;
      }

      pauseForManualInteraction();
      normalizeScrollPosition(true);
    };

    const updateWidth = () => {
      contentWidthRef.current = track.scrollWidth / 3;
      if (contentWidthRef.current > 0) {
        viewport.scrollLeft = contentWidthRef.current;
        scrollPositionRef.current = viewport.scrollLeft;
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(track);
    viewport.addEventListener('pointerdown', pauseForManualInteraction, { passive: true });
    viewport.addEventListener('touchstart', pauseForManualInteraction, { passive: true });
    viewport.addEventListener('wheel', pauseForManualInteraction, { passive: true });
    viewport.addEventListener('scroll', handleScroll, { passive: true });

    if (prefersReducedMotion) {
      return () => {
        resizeObserver.disconnect();
        viewport.removeEventListener('pointerdown', pauseForManualInteraction);
        viewport.removeEventListener('touchstart', pauseForManualInteraction);
        viewport.removeEventListener('wheel', pauseForManualInteraction);
        viewport.removeEventListener('scroll', handleScroll);
      };
    }

    let frameId = 0;
    const animate = (timestamp: number) => {
      const lastFrame = lastFrameRef.current ?? timestamp;
      const delta = Math.min(timestamp - lastFrame, 64);
      lastFrameRef.current = timestamp;

      if (isPausedRef.current || timestamp < manualPauseUntilRef.current) {
        speedRef.current = 0;
        scrollPositionRef.current = viewport.scrollLeft;
        frameId = window.requestAnimationFrame(animate);
        return;
      }

      const targetSpeed = isPausedRef.current ? 0 : 18;
      const easing = 1 - Math.exp(-delta / 520);
      speedRef.current += (targetSpeed - speedRef.current) * easing;

      scrollPositionRef.current += speedRef.current * (delta / 1000);
      normalizeScrollPosition(false);
      isAutoScrollingRef.current = true;
      viewport.scrollLeft = scrollPositionRef.current;
      window.cancelAnimationFrame(clearAutoScrollFrame);
      clearAutoScrollFrame = window.requestAnimationFrame(() => {
        isAutoScrollingRef.current = false;
      });
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.cancelAnimationFrame(clearAutoScrollFrame);
      resizeObserver.disconnect();
      viewport.removeEventListener('pointerdown', pauseForManualInteraction);
      viewport.removeEventListener('touchstart', pauseForManualInteraction);
      viewport.removeEventListener('wheel', pauseForManualInteraction);
      viewport.removeEventListener('scroll', handleScroll);
      lastFrameRef.current = null;
    };
  }, [prefersReducedMotion]);

  return { viewportRef, trackRef };
}

function SpeakerMarquee({ speakers }: SpeakerMarqueeProps) {
  const [isPaused, setIsPaused] = useState(false);
  const { viewportRef, trackRef } = useSmoothMarquee(isPaused);
  const desktopCtaRef = useRef<HTMLDivElement>(null);
  const isCtaLoweredRef = useRef(false);

  if (speakers.length === 0) {
    return null;
  }

  const marqueeSpeakers = [...speakers, ...speakers, ...speakers];
  const setDesktopCtaOffset = (isLowered: boolean) => {
    if (isCtaLoweredRef.current === isLowered) {
      return;
    }

    isCtaLoweredRef.current = isLowered;
    desktopCtaRef.current?.style.setProperty('--speaker-cta-y', isLowered ? '2.5rem' : '1rem');
  };

  const handleCarouselMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const buttonRect = desktopCtaRef.current?.getBoundingClientRect();
    if (!buttonRect) {
      return;
    }

    const isAboveButton =
      event.clientX >= buttonRect.left &&
      event.clientX <= buttonRect.right &&
      event.clientY < buttonRect.top;

    setDesktopCtaOffset(isAboveButton);
  };

  return (
    <div className="mx-auto w-full max-w-[1264px] px-4 sm:max-w-[1164px] md:max-w-[1296px] md:px-8 lg:max-w-[1246px] xl:max-w-[1396px]">
      <div
        className="group relative pb-2 pt-2"
        role="region"
        aria-label="More ZurichJS speakers"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => {
          setIsPaused(false);
          setDesktopCtaOffset(false);
        }}
        onFocus={() => setIsPaused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsPaused(false);
            setDesktopCtaOffset(false);
          }
        }}
      >
        <div
          ref={viewportRef}
          onMouseMove={handleCarouselMouseMove}
          onMouseLeave={() => setDesktopCtaOffset(false)}
          className="scrollbar-hide relative overflow-x-auto overflow-y-visible overscroll-x-contain pb-8 pt-6 [mask-image:linear-gradient(to_right,transparent_0,black_56px,black_calc(100%-56px),transparent_100%)] sm:[mask-image:linear-gradient(to_right,transparent_0,black_96px,black_calc(100%-96px),transparent_100%)] md:pb-6"
        >
          <div
            ref={trackRef}
            className="flex w-max gap-4 px-14 sm:px-24"
          >
            {marqueeSpeakers.map((speaker, index) => (
              <SpeakerMarqueeCard key={`${speaker.id}-${index}`} speaker={speaker} />
            ))}
          </div>
        </div>

        <div className="pointer-events-none absolute left-4 top-1/2 z-30 hidden -translate-y-1/2 items-center gap-1 text-brand-black/55 md:flex">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Scroll speakers left</span>
        </div>
        <div className="pointer-events-none absolute right-4 top-1/2 z-30 hidden -translate-y-1/2 items-center gap-1 text-brand-black/55 md:flex">
          <span className="sr-only">Scroll speakers right</span>
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="flex justify-center md:hidden">
          <Button
            href="/speakers"
            size="xs"
            variant="black"
            asChild
            className="whitespace-nowrap shadow-none"
            onClick={() => {
              trackButtonClick({
                buttonText: 'See all speakers',
                buttonLocation: 'homepage_speaker_marquee_mobile',
                buttonAction: 'navigate_to_speakers',
              });
            }}
          >
            <span>See all speakers</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>

        <div
          ref={desktopCtaRef}
          className="pointer-events-none absolute bottom-0 left-1/2 z-30 hidden rounded-full bg-brand-white p-2 opacity-0 shadow-lg [transform:translate(-50%,var(--speaker-cta-y,1rem))] transition-[opacity,transform] duration-500 ease-out md:block md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100"
          style={{ '--speaker-cta-y': '1rem' } as React.CSSProperties}
        >
          <Button
              href="/speakers"
              size="md"
              variant="black"
              asChild
              className="shadow-none"
              onClick={() => {
                trackButtonClick({
                  buttonText: 'See the full speaker lineup',
                  buttonLocation: 'homepage_speaker_marquee',
                  buttonAction: 'navigate_to_speakers',
                });
              }}
            >
              <span>See the full speaker lineup</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
        </div>
      </div>
    </div>
  );
}

export function SpeakersSection({ className = '' }: SpeakersSectionProps) {
  const { data, isLoading } = useQuery(publicSpeakersQueryOptions());

  const speakers = data?.speakers || [];
  const featuredSpeakers = speakers.filter((speaker) => speaker.is_featured);
  const secondarySpeakers = speakers.filter((speaker) => !speaker.is_featured);

  // Sort speakers so those with names come first
  const sortedSpeakers = [...featuredSpeakers].sort((a, b) => {
    const aHasName = Boolean(a.first_name?.trim() || a.last_name?.trim());
    const bHasName = Boolean(b.first_name?.trim() || b.last_name?.trim());
    if (aHasName && !bHasName) return -1;
    if (!aHasName && bHasName) return 1;
    return 0;
  });

  if (isLoading && speakers.length === 0) {
    return <SpeakerCardsSkeleton />;
  }

  if (featuredSpeakers.length === 0) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Always horizontally scrollable */}
      <div className="overflow-x-auto overscroll-x-contain scrollbar-hide">
        <div className="flex gap-4 md:gap-6 p-4 w-max min-w-full justify-start lg:justify-center">
          {sortedSpeakers.slice(0, 5).map((speaker) => {
            const fullName = getSpeakerName(speaker);
            const titleWithCompany = getSpeakerTitle(speaker);

            return (
              <SpeakerCard
                key={speaker.id}
                name={fullName}
                title={titleWithCompany}
                avatarUrl={speaker.profile_image_url || ''}
                href={`/speakers/${speaker.slug}`}
              />
            );
          })}
        </div>
      </div>
      <SpeakerMarquee speakers={secondarySpeakers} />
    </div>
  );
}
