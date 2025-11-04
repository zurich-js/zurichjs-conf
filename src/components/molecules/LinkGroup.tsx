import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMotion } from '@/contexts/MotionContext';

export interface NavLink {
  label: string;
  href: string;
  external?: boolean;
  locked?: boolean;
}

export interface LinkGroupProps {
  title: string;
  links: NavLink[];
  className?: string;
}

/**
 * LinkGroup molecule component
 * Displays a title with a list of navigation links
 * Supports locked state with lock icon
 */
export const LinkGroup: React.FC<LinkGroupProps> = ({ title, links, className = '' }) => {
  const { shouldAnimate } = useMotion();

  const content = (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-white font-semibold text-lg">{title}</h3>
      <ul className="space-y-2" role="list">
        {links.map((link, index) => {
          const linkContent = (
            <>
              <span>{link.label}</span>
              {link.locked && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="inline-block ml-1.5"
                  aria-hidden="true"
                >
                  <path
                    d="M10 5H9V3.5C9 2.11929 7.88071 1 6.5 1C5.11929 1 4 2.11929 4 3.5V5H3C2.44772 5 2 5.44772 2 6V10C2 10.5523 2.44772 11 3 11H10C10.5523 11 11 10.5523 11 10V6C11 5.44772 10.5523 5 10 5ZM6.5 2C7.32843 2 8 2.67157 8 3.5V5H5V3.5C5 2.67157 5.67157 2 6.5 2Z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </>
          );

          const linkClassName = link.locked 
            ? 'text-[#64748B] cursor-not-allowed inline-block underline decoration-dotted decoration-1 underline-offset-4'
            : 'text-white hover:text-[#F1E271] transition-colors duration-200 inline-block underline decoration-dotted decoration-1 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[rgba(241,226,113,0.5)] rounded-sm';
          
          const ariaLabel = link.locked ? `${link.label} (Coming soon)` : link.label;

          if (link.locked) {
            return (
              <li key={index}>
                <span
                  className={linkClassName}
                  aria-label={ariaLabel}
                  aria-disabled="true"
                >
                  {linkContent}
                </span>
              </li>
            );
          }

          return (
            <li key={index}>
              {link.external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClassName}
                  aria-label={ariaLabel}
                >
                  {linkContent}
                </a>
              ) : (
                <Link href={link.href} className={linkClassName} aria-label={ariaLabel}>
                  {linkContent}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );

  if (shouldAnimate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
};

