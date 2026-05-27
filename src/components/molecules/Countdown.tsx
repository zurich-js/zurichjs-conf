import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCountdown } from '@/hooks/useCountdown';
import { useMotion } from '@/contexts/MotionContext';
import { padZero } from '@/hooks/useCountdown';
import {Kicker} from "@/components/atoms";

export interface CountdownProps {
  targetDate: string | Date;
  kicker?: string;
  kickerClassName?: string;
  className?: string;
  variant?: 'default' | 'light' | 'dark';
  align?: 'start' | 'center';
}

/**
 * Live countdown component
 * Displays days, hours, minutes, and seconds until target date
 * Updates every second with smooth animations
 */
export const Countdown: React.FC<CountdownProps> = ({
  targetDate,
  kicker = 'Time remaining',
  kickerClassName = '',
  className = '',
  variant = 'default',
  align = 'start',
}) => {
  const timeRemaining = useCountdown(targetDate);
  const { shouldAnimate } = useMotion();
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by only showing live countdown after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isDefault = variant === 'default';
  const textClass = variant === 'light' ? 'text-black' : 'text-brand-white';
  const labelClass = variant === 'light' ? 'text-black/50' : 'text-brand-gray-medium';
  const dividerClass = variant === 'light' ? 'bg-black/35' : 'bg-brand-gray-medium';
  const alignmentClass = align === 'center' ? 'items-center text-center' : 'items-start';
  const valueClass = isDefault ? 'text-md' : 'text-base sm:text-md';
  const unitLabelClass = isDefault ? 'text-sm' : 'text-xs sm:text-sm';
  const gapClass = isDefault ? 'gap-3' : 'gap-2 sm:gap-3';
  const dividerHeightClass = isDefault ? 'h-6' : 'h-5 sm:h-6';

  if (timeRemaining.isComplete) {
    return (
      <div
        className={`${textClass} text-center ${className}`}
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-semibold sm:text-base">Time is over</p>
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
      className={`flex flex-col ${alignmentClass} ${className}`}
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
      <Kicker className={`mt-2 ${isDefault ? '' : '!normal-case !tracking-normal'} ${kickerClassName}`}>
        {kicker}
      </Kicker>

      {/* Countdown Units */}
      <div className={`flex items-center justify-center lg:justify-start ${gapClass}`}>
        {units.map((unit, index) => (
          <React.Fragment key={unit.label}>
            {/* Unit Display */}
            <div className="flex flex-col items-center">
              <div
                className={`${valueClass} font-normal ${textClass} tabular-nums`}
                suppressHydrationWarning
              >
                {unit.padded ? padZero(unit.value) : unit.value}
              </div>
              <div className={`${unitLabelClass} ${labelClass} tracking-wide`}>
                {unit.label}
              </div>
            </div>

            {/* Divider */}
            {index < units.length - 1 && (
              <div className={`${dividerHeightClass} w-px ${dividerClass}`} aria-hidden="true" />
            )}
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  );
};
