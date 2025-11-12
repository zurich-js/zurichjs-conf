import React from 'react';
import { motion } from 'framer-motion';

export type KickerVariant = 'dark' | 'light';

export interface KickerProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  delay?: number;
  variant?: KickerVariant;
}

/**
 * Kicker component for small taglines or eyebrow text
 * Typically appears above main headings
 *
 * @param variant - 'dark' for light text on dark backgrounds (default), 'light' for dark text on light backgrounds
 */
export const Kicker: React.FC<KickerProps> = ({
  children,
  className = '',
  animate = false,
  delay = 0,
  variant = 'dark',
}) => {
  // Base styles shared across variants
  const baseStyles = 'uppercase tracking-widest font-medium';

  // Variant-specific styles
  const variantStyles = {
    dark: 'text-xs md:text-sm text-brand-gray-light',
    light: 'text-xs md:text-sm text-brand-gray-dark',
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${className}`;

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

