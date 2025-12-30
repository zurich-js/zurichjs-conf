import React from 'react';
import { motion } from 'framer-motion';

export interface BarItem {
  label: string;
  percentage: number;
  color: string;
}

export interface HorizontalBarChartProps {
  /** Title for the chart */
  title: string;
  /** Array of bar items */
  items: BarItem[];
  /** Animation delay in seconds */
  delay?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * HorizontalBarChart - Vertical stacked bar chart with inline labels
 *
 * Used to display role distribution or similar categorical data.
 * Shows a large vertical stacked bar with percentage and label on each segment.
 */
export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  title,
  items,
  delay = 0,
  className = '',
}) => {
  // Calculate total height for the bar (in pixels) - increased for better visibility
  const totalHeight = 420;
  // Minimum segment height to ensure labels are visible
  const minSegmentHeight = 20;

  return (
    <motion.div
      className={`bg-brand-white rounded-xl border border-brand-gray-light/20 p-4 flex flex-col ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <h4 className="text-xs font-semibold text-brand-black mb-4">{title}</h4>

      {/* Vertical stacked bar with labels */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-stretch" style={{ height: totalHeight }}>
          {/* Percentage labels (left) */}
          <div className="flex flex-col pr-2">
            {items.map((item) => {
              const segmentHeight = Math.max(
                (item.percentage / 100) * totalHeight,
                item.percentage > 0 ? minSegmentHeight : 0
              );
              return (
                <div
                  key={`pct-${item.label}`}
                  className="flex items-center justify-end"
                  style={{ height: `${segmentHeight}px` }}
                >
                  <span className="text-xs text-brand-gray-dark font-medium whitespace-nowrap">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bar */}
          <div className="w-16 flex flex-col rounded-lg overflow-hidden">
            {items.map((item, index) => {
              const segmentHeight = Math.max(
                (item.percentage / 100) * totalHeight,
                item.percentage > 0 ? minSegmentHeight : 0
              );
              return (
                <motion.div
                  key={item.label}
                  className="w-full origin-top"
                  style={{
                    backgroundColor: item.color,
                    height: `${segmentHeight}px`,
                  }}
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{
                    duration: 0.5,
                    delay: delay + index * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              );
            })}
          </div>

          {/* Role labels (right) */}
          <div className="flex flex-col pl-2">
            {items.map((item) => {
              const segmentHeight = Math.max(
                (item.percentage / 100) * totalHeight,
                item.percentage > 0 ? minSegmentHeight : 0
              );
              return (
                <div
                  key={`label-${item.label}`}
                  className="flex items-center"
                  style={{ height: `${segmentHeight}px` }}
                >
                  <span className="text-xs text-brand-gray-dark whitespace-nowrap">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
