import React from 'react';
import { motion } from 'framer-motion';

export interface TagCloudProps {
  /** Title for the tag cloud section */
  title: string;
  /** Array of tag labels */
  tags: string[];
  /** Animation delay in seconds */
  delay?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * TagCloud - Displays a collection of interest/skill tags
 *
 * Used to show audience interests in the sponsorship page.
 * Tags animate in with staggered delays.
 */
export const TagCloud: React.FC<TagCloudProps> = ({
  title,
  tags,
  delay = 0,
  className = '',
}) => {
  return (
    <motion.div
      className={`bg-brand-white rounded-xl border border-brand-gray-light/20 p-4 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <h4 className="text-xs font-semibold text-brand-black mb-3">{title}</h4>

      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag, index) => (
          <motion.span
            key={tag}
            className="
              px-2.5 py-1 rounded-full text-xs
              bg-brand-gray-lightest text-brand-gray-dark
              border border-brand-gray-light/30
            "
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{
              duration: 0.3,
              delay: delay + index * 0.03,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {tag}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
};
