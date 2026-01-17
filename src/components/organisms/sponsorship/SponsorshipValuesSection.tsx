import React from 'react';
import { motion } from 'framer-motion';
import { Heading, Kicker } from '@/components/atoms';
import type { SponsorshipValuesData, SponsorshipValueData } from '@/data/sponsorship';

export interface SponsorshipValuesSectionProps {
  data: SponsorshipValuesData;
}

interface ValueCardProps {
  value: SponsorshipValueData;
  delay?: number;
}

/**
 * ValueCard - Individual value card with icon, title, and description
 */
const ValueCard: React.FC<ValueCardProps> = ({ value, delay = 0 }) => {
  const Icon = value.icon;

  return (
    <motion.div
      className="relative p-4 rounded-xl"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {/* Decorative corner dots */}
      <div className="absolute top-3 right-3 flex gap-1">
        <span className="w-1 h-1 rounded-full bg-brand-gray-medium/30" />
        <span className="w-1 h-1 rounded-full bg-brand-gray-medium/30" />
      </div>

      {/* Icon */}
      <div className="w-10 h-10flex items-center justify-center mb-3">
        <Icon className="text-brand-white" size={20} strokeWidth={2} />
      </div>

      {/* Content */}
      <h3 className="text-base font-bold text-brand-white mb-1">
        {value.title}
      </h3>
      <p className="text-xs text-brand-gray-light leading-relaxed">
        {value.description}
      </p>
    </motion.div>
  );
};

/**
 * SponsorshipValuesSection - Values/principles section
 *
 * Displays organization values in a 2x2 grid on dark background.
 * Each value has an icon, title, and description.
 */
export const SponsorshipValuesSection: React.FC<SponsorshipValuesSectionProps> = ({
  data,
}) => {
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Kicker variant="dark">{data.kicker}</Kicker>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{
            duration: 0.5,
            delay: 0.1,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Heading
            level="h2"
            variant="dark"
            className="text-xl md:text-2xl font-bold"
          >
            {data.title}
          </Heading>
        </motion.div>
      </div>

      {/* Values Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.values.map((value, index) => (
          <ValueCard
            key={value.title}
            value={value}
            delay={0.1 + index * 0.1}
          />
        ))}
      </div>
    </div>
  );
};
