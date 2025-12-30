import React from 'react';
import { motion } from 'framer-motion';
import { Heading, Kicker } from '@/components/atoms';
import type { SponsorshipMissionData } from '@/data/sponsorship';

export interface SponsorshipMissionSectionProps {
  data: SponsorshipMissionData;
}

/**
 * SponsorshipMissionSection - Two-column mission/value proposition section
 *
 * Displays the sponsorship value proposition with kicker, title, and
 * two columns of descriptive text. Supports HTML content with links.
 */
export const SponsorshipMissionSection: React.FC<SponsorshipMissionSectionProps> = ({
  data,
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <motion.div
      className="flex flex-col gap-3"
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-100px' }}
    >
      <motion.div variants={itemVariants}>
        <Kicker variant="light">{data.kicker}</Kicker>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Heading
          level="h2"
          variant="light"
          className="text-xl md:text-2xl font-bold max-w-3xl"
        >
          {data.title}
        </Heading>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        {/* Left column */}
        <motion.div
          className="flex flex-col gap-3"
          variants={itemVariants}
        >
          {data.leftColumn.map((paragraph, index) => (
            <p
              key={index}
              className="text-sm text-brand-gray-medium leading-relaxed"
              dangerouslySetInnerHTML={{ __html: paragraph }}
            />
          ))}
        </motion.div>

        {/* Right column */}
        <motion.div
          className="flex flex-col gap-3"
          variants={itemVariants}
        >
          {data.rightColumn.map((paragraph, index) => (
            <p
              key={index}
              className="text-sm text-brand-gray-medium leading-relaxed"
              dangerouslySetInnerHTML={{ __html: paragraph }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};
