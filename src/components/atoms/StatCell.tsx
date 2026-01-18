import React from 'react';

export interface StatCellProps {
  /**
   * The numeric value to display
   */
  value: number;
  /**
   * The label for this time unit
   */
  label: string;
  /**
   * Optional custom formatting for the value
   */
  formatter?: (val: number) => string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Format a number with proper padding and grouping
 * Uses Intl.NumberFormat for proper localization
 */
const defaultFormatter = (value: number, useGrouping: boolean = false): string => {
  return new Intl.NumberFormat(undefined, {
    minimumIntegerDigits: useGrouping ? 1 : 2,
    useGrouping,
  }).format(value);
};

/**
 * StatCell displays a single time unit (days, hours, minutes, or seconds)
 * with proper typography, accessibility, and tabular number formatting
 */
export const StatCell: React.FC<StatCellProps> = ({
  value,
  label,
  formatter,
  className = '',
}) => {
  // Days use grouping (e.g., "1,234"), others use zero-padding (e.g., "09")
  const useGrouping = label.toLowerCase().includes('day');
  const formattedValue = formatter
    ? formatter(value)
    : defaultFormatter(value, useGrouping);

  return (
    <div
      className={`flex items-center justify-center gap-3 ${className}`}
      role="group"
      aria-label={`${value} ${label}`}
    >
      {/* Numeric value */}
      <div
        className="text-2xl lg:text-3xl font-bold tabular-nums tracking-tight text-brand-white"
        style={{
          fontVariantNumeric: 'tabular-nums',
          minWidth: useGrouping ? '2.5ch' : '2ch',
        }}
        aria-hidden="true"
      >
        {formattedValue}
      </div>

      {/* Label */}
      <div
        className="text-sm md:text-base font-medium text-brand-white tracking-wide"
        aria-hidden="true"
      >
        {label}
      </div>
    </div>
  );
};

