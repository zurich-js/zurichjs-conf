import React from 'react';
import { motion } from 'framer-motion';

export interface IconButtonProps {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  animate?: boolean;
  delay?: number;
  className?: string;
}

/**
 * IconButton component with icon on the left and text on the right
 * Features hover animations for the entire button
 */
export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  children,
  onClick,
  animate = false,
  delay = 0,
  className = '',
}) => {
  const buttonContent = (
    <motion.button
      onClick={onClick}
      className={`flex items-center gap-2 group cursor-pointer w-fit ${className}`}
      whileHover={{ x: 8 }}
      transition={{ duration: 0.3 }}
    >
      {/* Icon Container */}
      <div className="w-14 h-14 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>

      {/* Text */}
      <span className="text-base md:text-md font-bold text-text-primary group-hover:text-brand-primary transition-colors duration-300">
        {children}
      </span>
    </motion.button>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {buttonContent}
      </motion.div>
    );
  }

  return buttonContent;
};

