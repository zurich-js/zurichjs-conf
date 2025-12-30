import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export interface StatHighlightCardProps {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Main value (e.g., "75%+") */
  value: string;
  /** Label describing the stat */
  label: string;
  /** Animation delay in seconds */
  delay?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * StatHighlightCard - Displays a key statistic with icon
 *
 * Used in the sponsorship audience section to highlight key demographics.
 * Shows an icon, large value, and descriptive label.
 */
export const StatHighlightCard: React.FC<StatHighlightCardProps> = ({
  icon: Icon,
  value,
  label,
  delay = 0,
  className = '',
}) => {
  return (
    <motion.div
      className={`
        flex flex-col items-center text-center p-4
        bg-brand-white rounded-xl border border-brand-gray-light/20
        ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Icon
        className="text-brand-gray-dark mb-2"
        size={22}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <span className="text-lg font-bold text-brand-black mb-0.5">
        {value}
      </span>
      <span className="text-xs text-brand-gray-medium">
        {label}
      </span>
    </motion.div>
  );
};
