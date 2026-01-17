import React from 'react';
import { motion } from 'framer-motion';
import { Heading } from '@/components/atoms';
import type { SponsorshipHeroData } from '@/data/sponsorship';

export interface SponsorshipHeroSectionProps {
  data: SponsorshipHeroData;
}

/**
 * SponsorshipHeroSection - Hero section for sponsorship page
 *
 * Simple, clean hero with large title. Similar pattern to other page heroes.
 */
export const SponsorshipHeroSection: React.FC<SponsorshipHeroSectionProps> = ({
  data,
}) => {
  return (
    <div className="flex flex-col gap-2 pt-4 pb-12 md:pt-5 md:pb-16 lg:pt-6 lg:pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <Heading
          level="h1"
          variant="light"
          className="text-2xl lg:text-3xl font-bold"
        >
          {data.title}
        </Heading>
      </motion.div>
    </div>
  );
};
