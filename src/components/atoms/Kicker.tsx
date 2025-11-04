import React from 'react';
import { motion } from 'framer-motion';

export interface KickerProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  delay?: number;
}

/**
 * Kicker component for small taglines or eyebrow text
 * Typically appears above main headings
 */
export const Kicker: React.FC<KickerProps> = ({
  children,
  className = '',
  animate = false,
  delay = 0,
}) => {
  const baseClassName = 'text-base md:text-lg xl:text-xl uppercase tracking-wider font-bold text-white/90';
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

