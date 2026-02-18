import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Kicker } from '@/components/atoms/Kicker';
import {
    PhotoSwiper,
    type PhotoSlide,
    LogoMarquee,
    PackedGrid,
    SponsorCard,
    SponsorCtaCard,
} from '@/components/molecules';
import { SectionContainer } from '@/components/organisms/SectionContainer';
import { useMotion } from '@/contexts/MotionContext';
import { usePublicSponsors, useCommunityPartners } from '@/hooks/usePublicSponsors';
import type { PublicSponsor } from '@/lib/types/sponsorship';
import type { GridItemConfig } from '@/hooks/useGridPacker';

export interface SponsorsSectionProps {
    kicker?: string;
    title: string;
    photos?: PhotoSlide[];
}

/**
 * Sort sponsors by tier priority
 * Order: diamond > platinum > gold > silver > bronze > supporter
 */
const TIER_PRIORITY: Record<string, number> = {
    diamond: 1,
    platinum: 2,
    gold: 3,
    silver: 4,
    bronze: 5,
    supporter: 6,
};

function sortSponsorsByTier(sponsors: PublicSponsor[]): PublicSponsor[] {
    return [...sponsors].sort((a, b) => {
        const priorityA = TIER_PRIORITY[a.tier] ?? 99;
        const priorityB = TIER_PRIORITY[b.tier] ?? 99;
        return priorityA - priorityB;
    });
}

/**
 * SponsorsSection - Organism component for displaying sponsors and photo gallery
 *
 * Features:
 * - Dynamic sponsor grid with CTA card
 * - Community partners marquee
 * - Photo gallery with swiper
 * - SSR-ready with TanStack Query
 */
export const SponsorsSection: React.FC<SponsorsSectionProps> = ({
                                                                    kicker = 'SPONSORS & PARTNERS',
                                                                    title,
                                                                    photos = [],
                                                                }) => {
    const { shouldAnimate } = useMotion();
    const { data: sponsorsData } = usePublicSponsors();
    const { data: partnersData } = useCommunityPartners();

    const sponsors = sponsorsData?.sponsors ?? [];
    const partners = partnersData?.partners ?? [];

    // Sort sponsors by tier and allocate to slots
    const sortedSponsors = sortSponsorsByTier(sponsors);
    const largeSponsor = sortedSponsors[0] ?? null;
    const mediumSponsors = sortedSponsors.slice(1, 5); // Next 4 sponsors
    const smallSponsors = sortedSponsors.slice(5, 9); // Next 4 sponsors

    // Fill slots with placeholders where needed
    const mediumSlots = Array.from({ length: 4 }, (_, i) => mediumSponsors[i] ?? null);
    const smallSlots = Array.from({ length: 4 }, (_, i) => smallSponsors[i] ?? null);

    const hasPartners = partners.length > 0;

    const packedItems: GridItemConfig[] = [
        { id: 'large-1', sizes: { base: { cols: 2, rows: 2 }, sm: { cols: 3, rows: 2 } }, priority: 1 },
        { id: 'large-2', sizes: { base: { cols: 2, rows: 2 }, sm: { cols: 3, rows: 2 } }, priority: 1 },
        { id: 'medium-1', sizes: { base: { cols: 2, rows: 1 }, sm: { cols: 2, rows: 1 } }, priority: 2 },
        { id: 'medium-2', sizes: { base: { cols: 2, rows: 1 }, sm: { cols: 2, rows: 1 } }, priority: 2 },
        { id: 'medium-3', sizes: { base: { cols: 2, rows: 1 }, sm: { cols: 2, rows: 1 } }, priority: 2 },
        { id: 'medium-4', sizes: { base: { cols: 2, rows: 1 }, sm: { cols: 2, rows: 1 } }, priority: 2 },
        { id: 'small-1', sizes: { base: { cols: 1, rows: 1 }, sm: { cols: 1, rows: 1 } }, priority: 3 },
        { id: 'small-2', sizes: { base: { cols: 1, rows: 1 }, sm: { cols: 1, rows: 1 } }, priority: 3 },
        { id: 'small-3', sizes: { base: { cols: 1, rows: 1 }, sm: { cols: 1, rows: 1 } }, priority: 3 },
        { id: 'small-4', sizes: { base: { cols: 1, rows: 1 }, sm: { cols: 1, rows: 1 } }, priority: 3 },
    ];

    return (
        <div className="">
            {/* Header Content */}
            <SectionContainer>
                <div className="text-center text-brand-gray-light">
                    <Kicker animate delay={0.1}>
                        {kicker}
                    </Kicker>
                    <p className="text-lg mt-4 text-white">
                        {title}
                    </p>
                </div>
            </SectionContainer>

            {/* Sponsor Grid */}
            <SectionContainer>
                <motion.div
                    className="mt-8"
                    initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                    animate={shouldAnimate ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                    <PackedGrid
                        items={packedItems}
                        columns={{ base: 2, sm: 5, md: 6, xl: 12 }}
                        gap={16}
                        renderItem={(item) => (
                            <div className="bg-brand-gray-dark rounded-lg flex items-center justify-center h-full">
                                <span className="text-white">{item.id.split('-')[0].toUpperCase()}</span>
                            </div>
                        )}
                    />
                    {/*
            Layout breakpoints:
            - Mobile (<640px): Single column with 2x2 sub-grids
            - Tablet (640-1024px): 2-column main grid
            - Desktop lg (1024-1279px): Flex row, may wrap
            - Desktop xl (1280px+): Single line, no wrap

            Gap strategy: Consistent 16px (gap-4) at all breakpoints for visual harmony
          */}
                    <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap xl:flex-nowrap lg:justify-center lg:items-start">
                        {/* Row 1: CTA + Large sponsor (side by side on tablet+) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:contents">
                            {/* CTA Card */}
                            <div className="w-full lg:w-auto lg:shrink-0">
                                <SponsorCtaCard />
                            </div>

                            {/* Large sponsor card */}
                            <div className="w-full lg:w-auto lg:shrink-0">
                                <SponsorCard sponsor={largeSponsor} size="large" placeholder={!largeSponsor} />
                            </div>
                        </div>

                        {/* Row 2: Medium sponsors 2×2 grid */}
                        <div className="w-full lg:w-auto lg:shrink-0">
                            <div className="grid grid-cols-2 gap-4 max-w-[320px] mx-auto sm:max-w-none sm:mx-0 lg:w-[320px]">
                                {mediumSlots.map((sponsor, index) => (
                                    <SponsorCard
                                        key={sponsor?.id ?? `placeholder-medium-${index}`}
                                        sponsor={sponsor}
                                        size="medium"
                                        placeholder={!sponsor}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Small sponsors - 2x2 grid at all breakpoints */}
                        <div className="w-full sm:w-auto lg:shrink-0">
                            <div className="grid grid-cols-2 gap-4 w-fit mx-auto sm:mx-0">
                                {smallSlots.map((sponsor, index) => (
                                    <SponsorCard
                                        key={sponsor?.id ?? `placeholder-small-${index}`}
                                        sponsor={sponsor}
                                        size="small"
                                        placeholder={!sponsor}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </SectionContainer>

            {/* Community Partners Marquee */}
            {hasPartners && (
                <motion.div
                    className="mt-12"
                    initial={shouldAnimate ? { opacity: 0 } : false}
                    animate={shouldAnimate ? { opacity: 1 } : {}}
                    transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                    <LogoMarquee
                        logos={partners}
                        speed={40}
                        pauseOnHover
                        grayscale
                        ariaLabel="Community partners"
                    />
                </motion.div>
            )}

            {/* ZurichJS Community Text */}
            <SectionContainer>
                <motion.p
                    className="flex items-center gap-2 justify-center text-brand-gray-light text-lg mt-8"
                    initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                    animate={shouldAnimate ? { opacity: 1, y: 0 } : {}}
                    transition={{
                        duration: 0.6,
                        delay: hasPartners ? 0.5 : 0.3,
                        ease: [0.22, 1, 0.36, 1],
                    }}
                >
                    and the
                    <Image
                        src="/images/logo/zurichjs-full.svg"
                        alt="ZurichJS Logo"
                        height={32}
                        width={110}
                        unoptimized
                    />
                    community
                </motion.p>
            </SectionContainer>

            {/* Photo Gallery - Extends beyond right edge */}
            {photos.length > 0 && (
                <div className="relative mt-16 mb-8">
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
                        <a href="mailto:hello@zurichjs.com" className="text-md text-brand-blue hover:text-brand-gray-lightest duration-300 ease-in-out">
                            Reach&nbsp;out&nbsp;to&nbsp;us
                        </a>
                    </p>
                </motion.div>
            </SectionContainer>
        </div>
    );
};
