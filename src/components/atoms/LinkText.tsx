import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export interface LinkTextProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
  animate?: boolean;
}

/**
 * LinkText atom component
 * Styled text link with hover effects and optional animation
 */
export const LinkText: React.FC<LinkTextProps> = ({
  href,
  children,
  className = '',
  external = false,
  animate = false,
}) => {
  const baseClassName = 'inline-flex items-center gap-2 text-[#258BCC] hover:text-[#1E6FA3] font-semibold transition-colors duration-200 underline decoration-2 underline-offset-4';
  const combinedClassName = `${baseClassName} ${className}`;

  const content = (
    <>
      {children}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="inline-block"
        aria-hidden="true"
      >
        <path
          d="M6 3L11 8L6 13"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );

  if (external) {
    if (animate) {
      return (
        <motion.a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={combinedClassName}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          {content}
        </motion.a>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={combinedClassName}
      >
        {content}
      </a>
    );
  }

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link href={href} className={combinedClassName}>
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <Link href={href} className={combinedClassName}>
      {content}
    </Link>
  );
};


