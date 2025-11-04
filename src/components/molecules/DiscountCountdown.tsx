import React, { useEffect, useState } from 'react';
import { useCountdown, padZero } from '@/hooks/useCountdown';
import { tokens } from '@/styles/tokens';

export interface DiscountCountdownProps {
  /**
   * ISO timestamp for when the discount expires
   */
  discountEndsAt: string;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Optional title text
   */
  title?: string;
}

interface TimeUnit {
  value: number;
  label: string;
}

/**
 * DiscountCountdown component displays a live countdown to discount expiration
 * with a stacked vertical layout, black background, and white text
 * Respects prefers-reduced-motion and is SSR-safe
 */
export const DiscountCountdown: React.FC<DiscountCountdownProps> = ({
  discountEndsAt,
  className = '',
  title = 'Discount expires in',
}) => {
  const { days, hours, minutes, seconds, isComplete } = useCountdown(discountEndsAt);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    setIsMounted(true);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Don't render if countdown is complete
  if (isComplete) {
    return null;
  }

  // Build time units array
  const timeUnits: TimeUnit[] = [
    { value: days, label: days === 1 ? 'Day' : 'Days' },
    { value: hours, label: hours === 1 ? 'Hour' : 'Hours' },
    { value: minutes, label: minutes === 1 ? 'Minute' : 'Minutes' },
    { value: seconds, label: seconds === 1 ? 'Second' : 'Seconds' },
  ];

  // Format value with padding (except for days)
  const formatValue = (value: number, label: string): string => {
    if (label.toLowerCase().includes('day')) {
      return value.toString();
    }
    return padZero(value);
  };

  // ARIA label for screen readers
  const ariaLabel = `${title} ${days} ${timeUnits[0].label}, ${hours} ${timeUnits[1].label}, ${minutes} ${timeUnits[2].label}, ${seconds} ${timeUnits[3].label}`;

  // Fade-in animation class
  const fadeInClass = isMounted && !prefersReducedMotion
    ? 'animate-fade-in'
    : 'opacity-100';

  return (
    <div className={`flex justify-center ${className}`}>
      <div
        className={`inline-flex flex-col items-center justify-center px-6 py-5 md:px-8 md:py-6 rounded-[28px] w-full max-w-fit ${fadeInClass}`}
        style={{
          backgroundColor: tokens.colors.countdown.surface,
          boxShadow: tokens.shadows.card,
          transition: prefersReducedMotion ? 'none' : 'opacity 120ms ease-out',
        }}
        role="timer"
        aria-live="polite"
        aria-atomic="true"
        aria-label={ariaLabel}
      >
        {/* Title */}
        <div
          className="text-center text-base md:text-lg font-semibold mb-5"
          style={{ color: tokens.colors.countdown.textPrimary }}
          aria-hidden="true"
        >
          {title}
        </div>

        {/* Horizontal time units */}
        <div className="flex items-center justify-center gap-0">
          {timeUnits.map((unit, index) => (
            <React.Fragment key={unit.label}>
              <div className="flex flex-col items-center justify-center px-4 lg:px-6">
                {/* Value */}
                <div
                  className="text-4xl md:text-5xl font-bold tabular-nums tracking-tight"
                  style={{
                    color: tokens.colors.countdown.textPrimary,
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: '2ch',
                  }}
                  aria-hidden="true"
                >
                  {formatValue(unit.value, unit.label)}
                </div>
                
                {/* Label */}
                <div
                  className="text-xs md:text-sm font-medium mt-1"
                  style={{
                    color: tokens.colors.countdown.textPrimary,
                    letterSpacing: '0.02em',
                  }}
                  aria-hidden="true"
                >
                  {unit.label}
                </div>
              </div>
              
              {/* Vertical divider between units */}
              {index < timeUnits.length - 1 && (
                <div
                  className="h-16 w-px"
                  style={{ backgroundColor: tokens.colors.countdown.divider }}
                  role="separator"
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Visually hidden live region for screen readers */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {ariaLabel}
        </div>
      </div>
    </div>
  );
};

