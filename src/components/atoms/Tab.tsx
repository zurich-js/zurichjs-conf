import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

export interface TabProps {
  id: string;
  label: string;
  isActive: boolean;
  onClick: (id: string) => void;
  index?: number;
}

/**
 * Tab atom component
 * Accessible tab button with active state indicator
 * Supports keyboard navigation and ARIA attributes
 */
export const Tab: React.FC<TabProps> = ({
  id,
  label,
  isActive,
  onClick,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus management for keyboard navigation
    if (isActive && document.activeElement?.getAttribute('role') === 'tab') {
      buttonRef.current?.focus();
    }
  }, [isActive]);

  const handleClick = () => {
    onClick(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    // Keyboard navigation is handled by the parent DayTabs component
    // This is just for consistency
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(id);
    }
  };

  return (
    <button
      ref={buttonRef}
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${id}`}
      id={`tab-${id}`}
      tabIndex={isActive ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        relative px-4 py-3 text-sm md:text-base font-medium transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-primary focus:ring-offset-2 focus:ring-offset-gray-0
        ${isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}
      `}
    >
      <span className="relative z-10">{label}</span>
      {isActive && (
        <motion.div
          layoutId="activeTabIndicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary"
          initial={false}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
        />
      )}
    </button>
  );
};



