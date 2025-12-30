import React from 'react';
import { motion } from 'framer-motion';

export interface EngagementCardProps {
  /** Title for the card */
  title: string;
  /** Engagement stat label */
  label: string;
  /** Percentage value (0-100) */
  percentage: number;
  /** Animation delay in seconds */
  delay?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * EngagementCard - Displays a single engagement metric
 */
export const EngagementCard: React.FC<EngagementCardProps> = ({
  title,
  label,
  percentage,
  delay = 0,
  className = '',
}) => {
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
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-brand-gray-dark">{label}</span>
          <span className="text-xs font-semibold text-brand-gray-dark">
            {percentage}%
          </span>
        </div>
        <div className="w-full h-2 bg-brand-gray-light/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-brand-yellow-main"
            initial={{ width: 0 }}
            whileInView={{ width: `${percentage}%` }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{
              duration: 0.8,
              delay: delay + 0.2,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        </div>
      </div>
    </motion.div>
  );
};
