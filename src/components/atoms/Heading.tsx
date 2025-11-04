import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
export type HeadingVariant = 'dark' | 'light';

export interface HeadingProps {
  level?: HeadingLevel;
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  delay?: number;
  variant?: HeadingVariant;
}

/**
 * Semantic heading component with optional animation
 * Supports all heading levels with consistent styling
 * 
 * @param variant - 'dark' for light text on dark backgrounds (default), 'light' for dark text on light backgrounds
 */
export const Heading: React.FC<HeadingProps> = ({
  level = 'h1',
  children,
  className = '',
  animate = false,
  delay = 0,
  variant = 'dark',
}) => {
  const Component = level;
  
  // Base styles shared across variants
  const baseStyles = 'font-bold';
  
  // Variant-specific styles
  const variantStyles = {
    dark: 'text-white',
    light: 'text-gray-900',
  };
  
  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${className}`;

  if (animate) {
    const MotionComponent = motion[Component] as React.ComponentType<HTMLMotionProps<typeof Component>>;
    
    return (
      <MotionComponent
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
      </MotionComponent>
    );
  }

  return <Component className={combinedClassName}>{children}</Component>;
};

