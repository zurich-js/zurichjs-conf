import React from 'react';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export interface EventItemProps {
  time: string;
  title: string;
  description: string;
  index: number;
  isLast?: boolean;
}

/**
 * EventItem molecule component
 * Displays a single event with time, title, and description
 * Includes sequential animation and divider
 */
export const EventItem: React.FC<EventItemProps> = ({
  time,
  title,
  description,
  index,
  isLast = false,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <motion.div
      variants={prefersReducedMotion ? undefined : variants}
      initial="hidden"
      animate="visible"
      className={`py-6 ${!isLast ? 'border-b border-gray-200' : ''}`}
    >
      <div className="flex flex-col sm:flex-row sm:gap-8">
        {/* Time */}
        <time
          className="text-sm md:text-base font-semibold text-gray-900 mb-2 sm:mb-0 sm:w-32 flex-shrink-0"
        >
          {time}
        </time>
        
        {/* Content */}
        <div className="flex-1">
          <h4 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
            {title}
          </h4>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

