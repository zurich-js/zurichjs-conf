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

    const sortedSponsors = sortSponsorsByTier(sponsors);
    const hasPartners = partners.length > 0;

    const packedItems: GridItemConfig[] = [
        {
            id: 'large-1',
            sizes: {
                base: { cols: 2, rows: 2 },
                xs: { cols: 3, rows: 2 },
            },
            priority: 1
        },
        {
            id: 'large-2',
            sizes: {
                base: { cols: 2, rows: 2 },
                xs: { cols: 3, rows: 2 }
            },
            priority: 1
        },
        {
            id: 'medium-1',
            sizes: {
                base: { cols: 2, rows: 1 },
                sm: { cols: 2, rows: 2 }
            },
            priority: 2
        },
        {
            id: 'medium-2',
            sizes: {
                base: { cols: 2, rows: 1 },
                sm: { cols: 2, rows: 2 }
            },
            priority: 2
        },
        {
            id: 'default-1',
            sizes: {
                base: { cols: 2, rows: 1 },
                sm: { cols: 2, rows: 1 }
            },
            priority: 3
        },
        {
            id: 'default-2',
            sizes: {
                base: { cols: 2, rows: 1 },
                sm: { cols: 2, rows: 1 }
            },
            priority: 3
        },
        {
            id: 'small-1',
            sizes: {
                base: { cols: 1, rows: 1 },
            },
            priority: 4
        },
        {
            id: 'small-2',
            sizes: {
                base: { cols: 1, rows: 1 },
            },
            priority: 4
        },
        {
            id: 'small-3',
            sizes: {
                base: { cols: 1, rows: 1 },
            },
            priority: 4
        },
        {
            id: 'small-4',
            sizes: {
                base: { cols: 1, rows: 1 },
            },
            priority: 4
        },
    ];

    // Map packed item IDs to sponsor data — items without a matching sponsor render as empty slots
    const sponsorBySlot = new Map<string, PublicSponsor>();
    let sponsorIdx = 0;
    for (const item of packedItems) {
        if (sponsorIdx < sortedSponsors.length) {
            sponsorBySlot.set(item.id, sortedSponsors[sponsorIdx]);
            sponsorIdx++;
        }
    }

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
                        columns={{ base: 2, xs: 3, sm: 5, md: 6, lg: 12 }}
                        gap="gap-3 sm:gap-4"
                        renderItem={(item) => {
                            const sponsor = sponsorBySlot.get(item.id);
                            const isFirstItem = item.id === packedItems[0].id;
                            const allEmpty = sortedSponsors.length === 0;
                            return (
                                <SponsorCard
                                    name={sponsor?.name}
                                    logo={sponsor?.logo}
                                    url={sponsor?.url}
                                    isCta={isFirstItem && allEmpty}
                                />
                            );
                        }}
                    />
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
