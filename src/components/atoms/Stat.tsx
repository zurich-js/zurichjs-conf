import React from 'react';
import { motion } from 'framer-motion';
import { padZero } from '@/hooks/useCountdown';

export interface StatProps {
  value: number;
  label: string;
  className?: string;
  animate?: boolean;
  delay?: number;
  padded?: boolean;
}

/**
 * Stat component for displaying numeric values with labels
 * Used in countdown and other metric displays
 */
export const Stat: React.FC<StatProps> = ({
  value,
  label,
  className = '',
  animate = false,
  delay = 0,
  padded = true,
}) => {
  const displayValue = padded ? padZero(value) : value.toString();
  
  const content = (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="text-4xl md:text-5xl font-bold text-brand-white tabular-nums">
        {displayValue}
      </div>
      <div className="text-sm md:text-base text-brand-white/70 uppercase tracking-wide mt-1">
        {label}
      </div>
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
};

