import React from 'react';
import { motion } from 'framer-motion';
import { ProgressBar } from './ProgressBar';

export interface ExperienceLevel {
  label: string;
  percentage: number;
}

export interface ExperienceLevelsCardProps {
  /** Title for the card */
  title: string;
  /** Experience level data */
  levels: ExperienceLevel[];
  /** Animation delay in seconds */
  delay?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ExperienceLevelsCard - Displays experience level distribution
 */
export const ExperienceLevelsCard: React.FC<ExperienceLevelsCardProps> = ({
  title,
  levels,
  delay = 0,
  className = '',
}) => {
  // Color progression for experience levels (blue gradient)
  const colors = ['#1e3a5f', '#4a6fa5', '#7c9ec9'];

  return (
    <motion.div
      className={`bg-brand-white rounded-xl border border-brand-gray-light/20 p-4 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <h4 className="text-xs font-semibold text-brand-black mb-3">{title}</h4>
      <div className="space-y-2">
        {levels.map((level, index) => (
          <ProgressBar
            key={level.label}
            label={level.label}
            percentage={level.percentage}
            color={colors[index % colors.length]}
            delay={delay + 0.1 + index * 0.1}
          />
        ))}
      </div>
    </motion.div>
  );
};
