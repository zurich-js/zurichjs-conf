import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { PriceCard, CTA } from '@/components/molecules/PriceCard';
import { DiscountCountdown } from '@/components/molecules/DiscountCountdown';
import { Feature } from '@/components/molecules/FeatureList';

export interface Plan {
  /**
   * Unique plan identifier
   */
  id: string;
  /**
   * Plan title (e.g., "Standard", "VIP", "Member")
   */
  title: string;
  /**
   * Short description/blurb
   */
  blurb?: string;
  /**
   * Compare/original price (in base units)
   */
  comparePrice?: number;
  /**
   * Current price (in base units)
   */
  price: number;
  /**
   * Currency code
   */
  currency: string;
  /**
   * List of features
   */
  features: Feature[];
  /**
   * Call-to-action configuration
   */
  cta: CTA;
  /**
   * Visual variant
   */
  variant?: 'standard' | 'vip' | 'member';
  /**
   * Optional tax/fees footnote
   */
  footnote?: string;
}

export interface TicketsSectionProps {
  /**
   * Section kicker/eyebrow text
   */
  kicker?: string;
  /**
   * Main heading
   */
  heading: string;
  /**
   * Subcopy with optional HTML/React nodes for emphasis
   */
  subcopy?: React.ReactNode;
  /**
   * Array of pricing plans (typically 3)
   */
  plans: Plan[];
  /**
   * ISO timestamp for when discount expires
   */
  discountEndsAt?: string;
  /**
   * Student/unemployed help link configuration
   */
  helpLine?: {
    text: string;
    href: string;
  };
  /**
   * Additional CSS classes
   */
  className?: string;
}


/**
 * TicketsSection organism component
 * Complete pricing section with yellow background, diagonal separators, price cards, and countdown
 */
export const TicketsSection: React.FC<TicketsSectionProps> = ({
  kicker = 'TICKETS',
  heading,
  subcopy,
  plans,
  discountEndsAt,
  helpLine,
  className = '',
}) => {
  return (
    <section
      className={`relative bg-brand-primary py-24 md:py-32 lg:py-40 ${className}`}
      aria-labelledby="tickets-heading"
    >

      {/* Content container */}
      <div className="relative z-20 container mx-auto px-4 md:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12 md:mb-16 lg:mb-20 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {kicker && (
            <p className="text-sm md:text-base uppercase tracking-wider font-bold text-black mb-4">
              {kicker}
            </p>
          )}
          
          <h1
            id="tickets-heading"
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-6"
          >
            {heading}
          </h1>

          {subcopy && (
            <div className="text-base md:text-lg lg:text-xl text-black leading-relaxed">
              {subcopy}
            </div>
          )}
        </motion.div>

        {/* Price cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-16">
          {plans.map((plan, index) => (
            <PriceCard
              key={plan.id}
              id={plan.id}
              title={plan.title}
              blurb={plan.blurb}
              comparePrice={plan.comparePrice}
              price={plan.price}
              currency={plan.currency}
              features={plan.features}
              cta={plan.cta}
              variant={plan.variant}
              footnote={plan.footnote}
              delay={index * 0.06}
            />
          ))}
        </div>

        {/* Footer: Help line and countdown */}
        <div className="flex flex-col items-center gap-6">
          {helpLine && (
            <motion.p
              className="text-sm md:text-base text-black"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {helpLine.text}{' '}
              <Link
                href={helpLine.href}
                className="font-bold text-black underline hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
              >
                Reach out to us
              </Link>
            </motion.p>
          )}

          {discountEndsAt && (
            <DiscountCountdown
              discountEndsAt={discountEndsAt}
              className="mt-2"
            />
          )}
        </div>
      </div>
    </section>
  );
};

