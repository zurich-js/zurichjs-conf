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
import { TIER_DISPLAY_CONFIG } from '@/lib/types/sponsorship';
import type { GridItemConfig } from '@/hooks/useGridPacker';

export interface SponsorsSectionProps {
    kicker?: string;
    title: string;
    photos?: PhotoSlide[];
}

// Minimum empty slots per size category to keep the grid looking full
const MIN_SLOTS: Record<string, number> = {
    large: 2,
    medium: 2,
    default: 2,
    small: 4,
};

function buildGridItems(sponsors: PublicSponsor[]): { items: GridItemConfig[]; sponsorMap: Map<string, PublicSponsor> } {
    const sponsorMap = new Map<string, PublicSponsor>();
    const categoryCounts: Record<string, number> = { large: 0, medium: 0, default: 0, small: 0 };

    // Create items directly from sponsor data (sizes + priority come from the API)
    const sponsorItems: GridItemConfig[] = sponsors.map((sponsor) => {
        const tierConfig = TIER_DISPLAY_CONFIG[sponsor.tier] ?? TIER_DISPLAY_CONFIG.bronze;
        categoryCounts[tierConfig.sizeCategory] = (categoryCounts[tierConfig.sizeCategory] || 0) + 1;
        sponsorMap.set(sponsor.id, sponsor);
        return {
            id: sponsor.id,
            sizes: sponsor.sizes,
            priority: sponsor.priority,
        };
    });

    // Fill remaining slots with empty placeholders
    const emptyItems: GridItemConfig[] = [];
    for (const [category, min] of Object.entries(MIN_SLOTS)) {
        const existing = categoryCounts[category] || 0;
        const needed = Math.max(0, min - existing);
        const templateConfig = Object.values(TIER_DISPLAY_CONFIG).find((c) => c.sizeCategory === category)!;
        for (let i = 0; i < needed; i++) {
            emptyItems.push({
                id: `empty-${category}-${i}`,
                sizes: templateConfig.sizes,
                priority: templateConfig.priority,
            });
        }
    }

    return { items: [...sponsorItems, ...emptyItems], sponsorMap };
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
    const hasPartners = partners.length > 0;

    const { items: packedItems, sponsorMap } = buildGridItems(sponsors);

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
                            const sponsor = sponsorMap.get(item.id);
                            const isFirstItem = item.id === packedItems[0].id;
                            const allEmpty = sponsors.length === 0;
                            return (
                                <SponsorCard
                                    name={sponsor?.name}
                                    logo={sponsor?.logo}
                                    logoColor={sponsor?.logoColor ?? undefined}
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
