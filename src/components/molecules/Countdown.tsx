import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCountdown } from '@/hooks/useCountdown';
import { useMotion } from '@/contexts/MotionContext';
import { padZero } from '@/hooks/useCountdown';

export interface CountdownProps {
  targetDate: string | Date;
  className?: string;
}

/**
 * Live countdown component
 * Displays days, hours, minutes, and seconds until target date
 * Updates every second with smooth animations
 */
export const Countdown: React.FC<CountdownProps> = ({ 
  targetDate, 
  className = '' 
}) => {
  const timeRemaining = useCountdown(targetDate);
  const { shouldAnimate } = useMotion();
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by only showing live countdown after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (timeRemaining.isComplete) {
    return (
      <div 
        className={`text-white text-center ${className}`}
        role="status"
        aria-live="polite"
      >
        <p className="text-2xl font-semibold">Event has started!</p>
      </div>
    );
  }

  const units = [
    { value: timeRemaining.days, label: 'DAYS', padded: false },
    { value: timeRemaining.hours, label: 'HOURS', padded: true },
    { value: timeRemaining.minutes, label: 'MINUTES', padded: true },
    { value: timeRemaining.seconds, label: 'SECONDS', padded: true },
  ];

  return (
    <motion.div
      className={className}
      role="timer"
      aria-live={isMounted ? "polite" : "off"}
      aria-label={isMounted ? `Time until event: ${timeRemaining.days} days, ${timeRemaining.hours} hours, ${timeRemaining.minutes} minutes, ${timeRemaining.seconds} seconds` : "Time until event"}
      initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.6,
        delay: 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {/* Header */}
      <div className="text-xs font-normal tracking-widest text-gray-400 mb-3 text-center lg:text-left">
        TIME REMAINING
      </div>

      {/* Countdown Units */}
      <div className="flex items-center justify-center lg:justify-start gap-3">
        {units.map((unit, index) => (
          <React.Fragment key={unit.label}>
            {/* Unit Display */}
            <div className="flex flex-col items-center">
              <div 
                className="text-2xl md:text-3xl font-light text-white tabular-nums"
                suppressHydrationWarning
              >
                {unit.padded ? padZero(unit.value) : unit.value}
              </div>
              <div className="text-xs text-gray-400 mt-1 tracking-wide">
                {unit.label}
              </div>
            </div>

            {/* Divider */}
            {index < units.length - 1 && (
              <div className="h-8 w-px bg-gray-600" aria-hidden="true" />
            )}
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  );
};

