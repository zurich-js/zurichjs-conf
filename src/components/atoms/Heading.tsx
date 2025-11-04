import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface HeadingProps {
  level?: HeadingLevel;
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  delay?: number;
}

/**
 * Semantic heading component with optional animation
 * Supports all heading levels with consistent styling
 */
export const Heading: React.FC<HeadingProps> = ({
  level = 'h1',
  children,
  className = '',
  animate = false,
  delay = 0,
}) => {
  const Component = level;
  
  const baseClassName = 'font-bold text-white';
  const combinedClassName = `${baseClassName} ${className}`;

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

