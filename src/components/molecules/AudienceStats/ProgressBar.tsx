import React from 'react';
import { motion } from 'framer-motion';

export interface ProgressBarProps {
  /** Label for the progress bar */
  label: string;
  /** Percentage value (0-100) */
  percentage: number;
  /** Bar color (Tailwind class or hex) */
  color?: string;
  /** Animation delay in seconds */
  delay?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ProgressBar - Horizontal progress bar with label and percentage
 *
 * Used to display experience levels or other percentage-based data.
 * Animates on scroll into view.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  label,
  percentage,
  color = 'bg-brand-blue',
  delay = 0,
  className = '',
}) => {
  // Determine if color is a hex value or Tailwind class
  const isHexColor = color.startsWith('#');
  const barStyle = isHexColor ? { backgroundColor: color } : undefined;
  const barClass = isHexColor ? '' : color;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-brand-gray-dark">{label}</span>
        <span className="text-xs font-semibold text-brand-gray-dark">
          {percentage.toFixed(2)}%
        </span>
      </div>
      <div className="w-full h-2 bg-brand-gray-light/30 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barClass}`}
          style={barStyle}
          initial={{ width: 0 }}
          whileInView={{ width: `${percentage}%` }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{
            duration: 0.8,
            delay,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      </div>
    </div>
  );
};
