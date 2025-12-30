import React from 'react';
import { motion } from 'framer-motion';
import { ProgressBar } from './ProgressBar';

export interface ExperienceLevel {
  label: string;
  percentage: number;
}

export interface EngagementStat {
  label: string;
  percentage: number;
}

export interface ExperienceChartProps {
  /** Title for the experience section */
  experienceTitle: string;
  /** Experience level data */
  experienceLevels: ExperienceLevel[];
  /** Title for the engagement section */
  engagementTitle: string;
  /** Engagement stat */
  engagement: EngagementStat;
  /** Animation delay in seconds */
  delay?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ExperienceChart - Combined experience levels and engagement display
 *
 * Shows horizontal progress bars for experience distribution
 * and a highlighted engagement stat.
 */
export const ExperienceChart: React.FC<ExperienceChartProps> = ({
  experienceTitle,
  experienceLevels,
  engagementTitle,
  engagement,
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
      {/* Experience Section */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-brand-black mb-3">
          {experienceTitle}
        </h4>
        <div className="space-y-2">
          {experienceLevels.map((level, index) => (
            <ProgressBar
              key={level.label}
              label={level.label}
              percentage={level.percentage}
              color={colors[index % colors.length]}
              delay={delay + 0.1 + index * 0.1}
            />
          ))}
        </div>
      </div>

      {/* Engagement Section */}
      <div>
        <h4 className="text-xs font-semibold text-brand-black mb-3">
          {engagementTitle}
        </h4>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-brand-gray-dark">{engagement.label}</span>
            <span className="text-xs font-semibold text-brand-gray-dark">
              {engagement.percentage}%
            </span>
          </div>
          <div className="w-full h-2 bg-brand-gray-light/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-brand-yellow-main"
              initial={{ width: 0 }}
              whileInView={{ width: `${engagement.percentage}%` }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{
                duration: 0.8,
                delay: delay + 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
