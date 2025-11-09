import React from 'react';
import { motion } from 'framer-motion';

export interface SubtextProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  delay?: number;
}

/**
 * Subtext component for body copy and supporting text
 * Used for descriptions below headings
 */
export const Subtext: React.FC<SubtextProps> = ({
  children,
  className = '',
  animate = false,
  delay = 0,
}) => {
  const baseClassName = 'text-base md:text-lg leading-relaxed text-slate-300';
  const combinedClassName = `${baseClassName} ${className}`;

  if (animate) {
    return (
      <motion.p
        className={combinedClassName}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {children}
      </motion.p>
    );
  }

  return <p className={combinedClassName}>{children}</p>;
};


