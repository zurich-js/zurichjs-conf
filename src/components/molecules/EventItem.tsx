import React from 'react';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export interface EventItemProps {
  time: string;
  title: string;
  description: string;
  index: number;
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
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <motion.div
      variants={prefersReducedMotion ? undefined : variants}
      initial="hidden"
      animate="visible"
      className="py-4"
    >
      <div className="flex flex-col sm:gap-2.5 sm:flex-row">
        {/* Time */}
        <time
          className="text-sm py-0.5 font-bold text-brand-gray-medium sm:min-w-32 flex-shrink-0"
        >
          {time}
        </time>

        {/* Content */}
        <div className="flex-1">
          <h4 className="text-lg font-bold text-brand-black mb-2 leading-none">
            {title}
          </h4>
          <p className="text-base text-brand-gray-medium leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
};


