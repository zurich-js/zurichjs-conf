import React from 'react';
import { motion } from 'framer-motion';

export interface PillProps {
  /**
   * Content to display inside the pill
   */
  children: React.ReactNode;
  /**
   * Visual variant
   */
  variant?: 'default' | 'warning' | 'success' | 'accent';
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Enable animation on mount
   */
  animate?: boolean;
}

const variantStyles: Record<NonNullable<PillProps['variant']>, string> = {
  default: 'bg-gray-800 text-text-primary border-gray-700',
  warning: 'bg-warning/10 text-warning border-warning/20',
  success: 'bg-success/10 text-success border-success/20',
  accent: 'bg-brand-primary/20 text-brand-primary border-brand-primary/30',
};

const sizeStyles: Record<NonNullable<PillProps['size']>, string> = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

/**
 * Pill component for badges, labels, and countdown displays
 * Includes optional animation and multiple variants
 */
export const Pill: React.FC<PillProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  animate = false,
}) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-full border font-medium';
  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  if (animate) {
    return (
      <motion.div
        className={combinedClassName}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.3,
          ease: 'easeOut',
        }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={combinedClassName}>
      {children}
    </div>
  );
};



