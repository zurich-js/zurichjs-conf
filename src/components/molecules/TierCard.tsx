import React from 'react';
import { motion } from 'framer-motion';
import { CheckIcon } from 'lucide-react';
import { Heading } from '@/components/atoms';

export interface TierBenefit {
  label: string;
}

export interface TierCardProps {
  /** Tier name/title */
  name: string;
  /** Short description */
  description: string;
  /** Price display (formatted string like "CHF 12'000") */
  priceDisplay: string;
  /** Currency label (e.g., "CHF") */
  currencyLabel?: string;
  /** List of benefits/features */
  benefits: TierBenefit[];
  /** Whether this tier is highlighted/featured */
  highlighted?: boolean;
  /** Animation delay in seconds */
  delay?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * TierCard - Reusable pricing tier card component
 *
 * Used for both sponsorship tiers and ticket pricing. Displays a dark card
 * with tier name, description, price, and list of benefits with check icons.
 *
 * @example
 * ```tsx
 * <TierCard
 *   name="Diamond"
 *   description="Ultimate visibility"
 *   priceDisplay="12'000"
 *   currencyLabel="CHF"
 *   benefits={[{ label: 'Prime booth location' }]}
 *   highlighted
 * />
 * ```
 */
export const TierCard: React.FC<TierCardProps> = ({
  name,
  description,
  priceDisplay,
  currencyLabel = 'CHF',
  benefits,
  highlighted = false,
  delay = 0,
  className = '',
}) => {
  return (
    <motion.article
      className={`
        flex flex-col bg-brand-black rounded-2xl p-4
        hover:bg-gradient-to-br hover:from-brand-black hover:to-brand-gray-medium/30
        transition-colors duration-500 ease-in-out
        ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{
        boxShadow: highlighted ? '5px 7px 15px rgba(0,0,0,0.4)' : undefined,
      }}
    >
      {/* Header */}
      <Heading
        level="h3"
        className="text-base font-bold text-brand-white mb-1"
      >
        {name}
      </Heading>

      {/* Description */}
      <p className="text-xs text-brand-gray-lightest leading-relaxed mb-3">
        {description}
      </p>

      {/* Price */}
      <div className="mb-4">
        <span className="text-xs text-brand-gray-light">{currencyLabel}</span>
        <span className="text-2xl font-bold text-brand-white ml-1">
          {priceDisplay}
        </span>
      </div>

      {/* Benefits list */}
      <ul className="flex flex-col gap-1.5 flex-1" role="list">
        {benefits.map((benefit, index) => (
          <li
            key={`${benefit.label}-${index}`}
            className="flex items-start gap-2 text-brand-white"
          >
            <CheckIcon
              className="text-brand-green flex-shrink-0 mt-0.5"
              size={14}
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className="text-xs">{benefit.label}</span>
          </li>
        ))}
      </ul>
    </motion.article>
  );
};
