import { useEffect, useState, useRef } from 'react';

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  isComplete: boolean;
}

/**
 * Hook to create a live countdown to a target date
 * @param targetDate - ISO date string or Date object for countdown target
 * @returns TimeRemaining object with days, hours, minutes, seconds, and total milliseconds
 */
export function useCountdown(targetDate: string | Date): TimeRemaining {
  const targetTime = useRef<number>(
    typeof targetDate === 'string' ? new Date(targetDate).getTime() : targetDate.getTime()
  ).current;

  const calculateTimeRemaining = (): TimeRemaining => {
    const now = Date.now();
    const total = targetTime - now;

    if (total <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        total: 0,
        isComplete: true,
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
      total,
      isComplete: false,
    };
  };

  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => {
    // Initialize on mount to avoid SSR/client mismatch
    if (typeof window === 'undefined') {
      // Return a placeholder on server
      return calculateTimeRemaining();
    }
    return calculateTimeRemaining();
  });

  useEffect(() => {
    // Set initial time on client mount to avoid hydration mismatch
    setTimeRemaining(calculateTimeRemaining());

    const intervalId = setInterval(() => {
      const newTime = calculateTimeRemaining();
      setTimeRemaining(newTime);

      // Clear interval if countdown is complete
      if (newTime.isComplete) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [targetTime]);

  return timeRemaining;
}

/**
 * Format a countdown value with proper pluralization
 * @param value - The numeric value to format
 * @param singular - Singular form of the label (e.g., "day")
 * @param plural - Plural form of the label (e.g., "days")
 * @returns Formatted string like "1 day" or "5 days"
 */
export function formatCountdownUnit(
  value: number,
  singular: string,
  plural?: string
): string {
  const label = value === 1 ? singular : (plural || `${singular}s`);
  return `${value} ${label}`;
}

/**
 * Pad a number with leading zeros
 * @param num - Number to pad
 * @param length - Desired length (default: 2)
 * @returns Padded string
 */
export function padZero(num: number, length: number = 2): string {
  return num.toString().padStart(length, '0');
}

