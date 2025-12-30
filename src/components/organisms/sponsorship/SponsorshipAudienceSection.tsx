import React from 'react';
import { motion } from 'framer-motion';
import { Heading, Kicker } from '@/components/atoms';
import {
  StatHighlightCard,
  HorizontalBarChart,
  ExperienceLevelsCard,
  EngagementCard,
  TagCloud,
} from '@/components/molecules';
import type { SponsorshipAudienceData } from '@/data/sponsorship';

export interface SponsorshipAudienceSectionProps {
  data: SponsorshipAudienceData;
}

/**
 * SponsorshipAudienceSection - Audience demographics and stats section
 *
 * Displays audience profile with highlight stats, role distribution chart,
 * experience levels, engagement metrics, and interest tags.
 */
export const SponsorshipAudienceSection: React.FC<SponsorshipAudienceSectionProps> = ({
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
      className="flex flex-col gap-5"
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-100px' }}
    >
      {/* Header */}
      <div className="flex flex-col gap-2">
        <motion.div variants={itemVariants}>
          <Kicker variant="light">{data.kicker}</Kicker>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Heading
            level="h2"
            variant="light"
            className="text-xl md:text-2xl font-bold"
          >
            {data.title}
          </Heading>
        </motion.div>

        <motion.div variants={itemVariants} className="max-w-3xl">
          {data.description.map((paragraph, index) => (
            <p
              key={index}
              className="text-sm text-brand-gray-medium leading-relaxed mb-1"
            >
              {paragraph}
            </p>
          ))}
        </motion.div>
      </div>

      {/* Highlight Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {data.highlightStats.map((stat, index) => (
          <StatHighlightCard
            key={stat.label}
            icon={stat.icon}
            value={stat.value}
            label={stat.label}
            delay={0.1 + index * 0.1}
          />
        ))}
      </div>

      {/* Conclusion text */}
      <motion.p
        className="text-sm text-brand-gray-medium leading-relaxed"
        variants={itemVariants}
      >
        {data.conclusion}
      </motion.p>

      {/* Two-column Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Left Column - Role Distribution (full height) */}
        <HorizontalBarChart
          title="Role"
          items={data.roleDistribution.map((item) => ({
            label: item.role,
            percentage: item.percentage,
            color: item.color,
          }))}
          delay={0.2}
          className="h-full"
        />

        {/* Right Column - Experience, Engagement, Interests (stretch to match left) */}
        <div className="flex flex-col gap-3 h-full">
          <ExperienceLevelsCard
            title="Experience"
            levels={data.experienceLevels}
            delay={0.3}
            className="flex-1"
          />

          <EngagementCard
            title="Engagement"
            label={data.engagement.label}
            percentage={data.engagement.percentage}
            delay={0.35}
            className="flex-1"
          />

          <TagCloud
            title="Interests"
            tags={data.interests}
            delay={0.4}
            className="flex-1"
          />
        </div>
      </div>
    </motion.div>
  );
};
