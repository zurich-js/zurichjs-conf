import React, { useEffect, useRef, useState } from 'react';
import { useCountdown } from '@/hooks/useCountdown';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { CountdownRow } from '@/components/molecules/CountdownRow';
import { tokens } from '@/styles/tokens';

export type CountdownPillProps = {
  /**
   * Target date/time in ISO 8601 format
   * @example '2026-09-11T08:30:00+02:00'
   */
  targetISO: string;
  /**
   * Title text displayed above the countdown
   * @default 'Discount expires in'
   */
  title?: string;
  /**
   * Callback fired once when countdown reaches zero
   */
  onExpire?: () => void;
  /**
   * Additional CSS classes for the container
   */
  className?: string;
  /**
   * Custom labels for time units
   */
  labels?: Partial<{
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
  }>;
  /**
   * If false, hide leading zero units (always show smallest non-zero + seconds)
   * @default true
   */
  showZeros?: boolean;
};

type RequiredLabels = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
};

/**
 * Format the remaining time for screen readers
 */
const formatAriaLabel = (
  title: string,
  days: number,
  hours: number,
  minutes: number,
  seconds: number,
  labels: RequiredLabels
): string => {
  return `${title} ${days} ${labels.days}, ${hours} ${labels.hours}, ${minutes} ${labels.minutes}, ${seconds} ${labels.seconds}`;
};

/**
 * CountdownPill - Production-grade countdown component
 * 
 * Features:
 * - SSR-safe with no hydration warnings
 * - Fully accessible with ARIA live regions
 * - Respects prefers-reduced-motion
 * - Responsive layout (2x2 grid on mobile, horizontal on desktop)
 * - Smooth animations with Framer Motion support
 * - Tabular number formatting to prevent layout shift
 */
export const CountdownPill: React.FC<CountdownPillProps> = ({
  targetISO,
  title = 'Discount expires in',
  onExpire,
  className = '',
  labels: customLabels = {},
  showZeros = true,
}) => {
  const { days, hours, minutes, seconds, isComplete } = useCountdown(targetISO);
  const prefersReducedMotion = usePrefersReducedMotion();
  const hasExpiredRef = useRef(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Merge custom labels with defaults
  const labels: RequiredLabels = {
    days: customLabels.days || 'Days',
    hours: customLabels.hours || 'Hours',
    minutes: customLabels.minutes || 'Minutes',
    seconds: customLabels.seconds || 'Seconds',
  };

  // Handle mount (for fade-in animation)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle expiration
  useEffect(() => {
    if (isComplete && !hasExpiredRef.current) {
      hasExpiredRef.current = true;
      setIsExpired(true);
      
      if (onExpire) {
        onExpire();
      }
    }
  }, [isComplete, onExpire]);

  // Generate ARIA label
  const ariaLabel = isExpired
    ? 'Offer ended'
    : formatAriaLabel(title, days, hours, minutes, seconds, labels);

  // Animation classes
  const fadeInClass = isMounted && !prefersReducedMotion
    ? 'animate-fade-in'
    : 'opacity-100';

  return (
    <div
      className={`inline-flex flex-col items-center justify-center w-full max-w-fit mx-auto ${fadeInClass} ${className}`}
      style={{
        transition: prefersReducedMotion ? 'none' : 'opacity 120ms ease-out',
      }}
    >
      <div
        className="flex flex-col items-center justify-center px-8 py-6 md:px-10 md:py-8 rounded-[28px] w-full max-w-md"
        style={{
          backgroundColor: tokens.colors.countdown.surface,
          boxShadow: tokens.shadows.card,
        }}
        role="timer"
        aria-live={isExpired ? 'assertive' : 'polite'}
        aria-atomic="true"
        aria-label={ariaLabel}
      >
        {/* Title */}
        <div
          className="text-center text-base md:text-lg font-semibold mb-5"
          style={{ color: tokens.colors.countdown.textPrimary }}
          aria-hidden="true"
        >
          {isExpired ? 'Offer ended' : title}
        </div>

        {/* Countdown display */}
        {!isExpired && (
          <CountdownRow
            days={days}
            hours={hours}
            minutes={minutes}
            seconds={seconds}
            labels={labels}
            showZeros={showZeros}
          />
        )}

        {/* Expired state */}
        {isExpired && (
          <div
            className="text-2xl md:text-3xl font-bold tabular-nums"
            style={{ color: tokens.colors.countdown.textMuted }}
            aria-hidden="true"
          >
            —
          </div>
        )}
      </div>

      {/* Visually hidden live region for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaLabel}
      </div>
    </div>
  );
};

/**
 * Pure helper function to format remaining time
 * Useful for testing and server-side rendering
 */
export const formatRemaining = (targetTimestamp: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
} => {
  const now = Date.now();
  const total = targetTimestamp - now;

  if (total <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
    };
  }

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
  };
};

