/**
 * UpsellBanner
 * Reusable promotional banner for cart upsells
 * Used for VIP upgrades, team packages, and other offers
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Button, type ButtonVariant } from '@/components/atoms';

export interface UpsellBannerProps {
  /** Banner headline */
  title: string;
  /** Description with optional highlighted text */
  description: React.ReactNode;
  /** Action button configuration */
  action:
    | {
        type: 'button';
        label: string;
        onClick: () => void;
      }
    | {
        type: 'link';
        label: string;
        href: string;
      };
  /** Button variant — use a quiet variant when the banner is secondary to the page's main CTA */
  actionVariant?: ButtonVariant;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * Promotional banner component for upselling in the cart
 * Supports both button actions and link actions
 */
export const UpsellBanner: React.FC<UpsellBannerProps> = ({
  title,
  description,
  action,
  actionVariant = 'primary',
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h3 className="text-md font-bold text-brand-white mb-1">{title}</h3>
          <p className="text-sm text-brand-gray-light mb-4">{description}</p>

          {action.type === 'link' ? (
            <Button variant={actionVariant} size="sm" asChild href={action.href}>
              {action.label}
            </Button>
          ) : (
            <Button variant={actionVariant} size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Helper component for highlighted text in upsell descriptions
 */
export const UpsellHighlight: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <strong className="text-brand-yellow-main drop-shadow-md drop-shadow-brand-yellow-main/30">
    {children}
  </strong>
);

export type { UpsellBannerProps as UpsellBannerPropsType };

