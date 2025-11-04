import React from 'react';
import { motion } from 'framer-motion';
import { useMotion } from '@/contexts/MotionContext';

export type TimelineIconType = 'ticket' | 'mic' | 'calendar' | 'flag' | 'info';

export interface TimelineDotProps {
  icon?: TimelineIconType;
  emphasis?: boolean;
  isCurrent?: boolean;
  delay?: number;
}

const iconPaths: Record<TimelineIconType, string> = {
  ticket: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  mic: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  flag: 'M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

/**
 * TimelineDot component representing an event on the timeline rail
 * Shows an icon within a circular dot with accent color
 */
export const TimelineDot: React.FC<TimelineDotProps> = ({
  icon = 'calendar',
  emphasis = false,
  isCurrent = false,
  delay = 0,
}) => {
  const { shouldAnimate } = useMotion();
  
  const dotClasses = `
    relative flex items-center justify-center
    w-10 h-10 rounded-full
    ${emphasis || isCurrent ? 'bg-brand-primary/20 ring-2 ring-brand-primary/40' : 'bg-surface-card'}
    border-2 border-surface-section
    transition-all duration-300
  `;

  const iconClasses = `
    w-5 h-5
    ${emphasis || isCurrent ? 'text-brand-primary' : 'text-slate-400'}
  `;

  const DotContent = () => (
    <div className={dotClasses}>
      <svg
        className={iconClasses}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={iconPaths[icon]}
        />
      </svg>
    </div>
  );

  if (shouldAnimate) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: 0.4,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <DotContent />
      </motion.div>
    );
  }

  return <DotContent />;
};

