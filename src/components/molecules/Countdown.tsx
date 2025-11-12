import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCountdown } from '@/hooks/useCountdown';
import { useMotion } from '@/contexts/MotionContext';
import { padZero } from '@/hooks/useCountdown';
import {Kicker} from "@/components/atoms";

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
        className={`text-brand-white text-center ${className}`}
        role="status"
        aria-live="polite"
      >
        <p className="text-xl font-semibold">Event has started!</p>
      </div>
    );
  }

  const units = [
    { value: timeRemaining.days, label: 'Days', padded: false },
    { value: timeRemaining.hours, label: 'Hours', padded: true },
    { value: timeRemaining.minutes, label: 'Minutes', padded: true },
    { value: timeRemaining.seconds, label: 'Seconds', padded: true },
  ];

  return (
    <motion.div
      className={`flex flex-col items-start`}
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
      <Kicker className="mb-2">
        Time remaining
      </Kicker>

      {/* Countdown Units */}
      <div className="flex items-center justify-center lg:justify-start gap-3">
        {units.map((unit, index) => (
          <React.Fragment key={unit.label}>
            {/* Unit Display */}
            <div className="flex flex-col items-center">
              <div
                className="text-md font-normal text-white tabular-nums"
                suppressHydrationWarning
              >
                {unit.padded ? padZero(unit.value) : unit.value}
              </div>
              <div className="text-sm text-brand-gray-medium tracking-wide">
                {unit.label}
              </div>
            </div>

            {/* Divider */}
            {index < units.length - 1 && (
              <div className="h-6 w-px bg-brand-gray-medium" aria-hidden="true" />
            )}
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  );
};

