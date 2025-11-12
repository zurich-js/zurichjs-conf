import React from 'react';
import { motion } from 'framer-motion';
import { useMotion } from '@/contexts/MotionContext';
import { LinkGroupItem } from '@/components/atoms';

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

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col gap-2.5 ${className}`}
    >
      <h3 className="text-brand-white font-semibold text-lg">{title}</h3>
      <ul className="flex flex-col gap-1" role="list">
        {links.map((link, index) => (
          <li key={index}>
            <LinkGroupItem
              label={link.label}
              href={link.href}
              external={link.external}
              locked={link.locked}
            />
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

