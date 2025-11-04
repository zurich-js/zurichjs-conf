import React from 'react';
import { StatCell } from '@/components/atoms/StatCell';
import { Separator } from '@/components/atoms/Separator';
import { tokens } from '@/styles/tokens';

export interface CountdownRowProps {
  /**
   * Time unit values
   */
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /**
   * Custom labels for each unit
   */
  labels?: {
    days?: string;
    hours?: string;
    minutes?: string;
    seconds?: string;
  };
  /**
   * Hide leading zero units (but always show at least the smallest non-zero + seconds)
   */
  showZeros?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * CountdownRow displays the time units in a responsive grid
 * with proper dividers and accessibility
 */
export const CountdownRow: React.FC<CountdownRowProps> = ({
  days,
  hours,
  minutes,
  seconds,
  labels = {},
  showZeros = true,
  className = '',
}) => {
  const defaultLabels = {
    days: labels.days || 'Days',
    hours: labels.hours || 'Hours',
    minutes: labels.minutes || 'Minutes',
    seconds: labels.seconds || 'Seconds',
  };

  // Determine which units to show based on showZeros prop
  const units = [
    { value: days, label: defaultLabels.days, key: 'days' },
    { value: hours, label: defaultLabels.hours, key: 'hours' },
    { value: minutes, label: defaultLabels.minutes, key: 'minutes' },
    { value: seconds, label: defaultLabels.seconds, key: 'seconds' },
  ];

  // Filter units based on showZeros logic
  const visibleUnits = showZeros 
    ? units 
    : (() => {
        // Find the first non-zero unit
        const firstNonZeroIndex = units.findIndex(u => u.value > 0);
        // If all are zero, show just seconds
        if (firstNonZeroIndex === -1) {
          return [units[units.length - 1]];
        }
        // Show from first non-zero to end
        return units.slice(firstNonZeroIndex);
      })();

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      {/* Vertical stacked layout */}
      {visibleUnits.map((unit, index) => (
        <React.Fragment key={unit.key}>
          <div className="py-2 px-6 w-full flex items-center justify-center">
            <StatCell 
              value={unit.value} 
              label={unit.label}
            />
          </div>
          {index < visibleUnits.length - 1 && (
            <Separator 
              variant="horizontal" 
              fill={tokens.colors.countdown.divider}
              className="w-full"
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

