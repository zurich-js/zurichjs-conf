import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { PriceCard, CTA } from '@/components/molecules/PriceCard';
import { Feature } from '@/components/molecules/FeatureList';
import {Heading, Kicker} from "@/components/atoms";
import {Countdown} from "@/components/molecules";

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
}

export interface TicketsSectionProps {
  /**
   * Section kicker/eyebrow text
   */
  kicker?: string;
  /**
   * Main heading
   */
  title: string;
  /**
   * Subcopy with optional HTML/React nodes for emphasis
   */
  subtitle?: React.ReactNode;
  /**
   * Array of pricing plans (typically 3)
   */
  plans: Plan[];
  /**
   * ISO timestamp for when discount expires
   */
  discountEndsAt?: string;
  /**
   * Countdown title (e.g., "Early Bird phase ends in", "Discount expires in")
   */
  countdownTitle?: string;
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
                                                                title,
                                                                subtitle,
                                                                plans,
                                                                discountEndsAt,
                                                                countdownTitle,
                                                                helpLine,
                                                                className = '',
                                                              }) => {
  // Reorder plans: Standard (left), VIP (center), Student/Unemployed (right)
  const reorderedPlans = React.useMemo(() => {
    const standard = plans.find(p => p.variant === 'standard');
    const vip = plans.find(p => p.variant === 'vip');
    const studentUnemployed = plans.find(p => p.variant === 'member');
    return [standard, vip, studentUnemployed].filter(Boolean) as Plan[];
  }, [plans]);

  return (
    <div
      className={`relative flex flex-col gap-10 ${className}`}
      aria-labelledby="tickets-heading"
    >
      {/* Content container */}
      <motion.div
        className="flex flex-col gap-2.5 items-center text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Kicker variant="light">
          {kicker}
        </Kicker>

        <Heading
          level="h2"
          variant="light"
          className="text-xl text-balance leading-none"
        >
          {title}
        </Heading>

        {subtitle && (
          <p className="text-base text-brand-black max-w-screen-sm">
            {subtitle}
          </p>
        )}
      </motion.div>

      <div className="flex flex-col gap-12">
        {/* Price cards - Custom layout with VIP centered and larger */}
        <div className="flex flex-col items-stretch lg:flex-row gap-8 xl:gap-12 lg:items-center justify-center max-w-7xl mx-auto">
          {reorderedPlans.map((plan, index) => (
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
                delay={index * 0.06}
              />
            )
          )}
        </div>

        {/* VAT transparency - directly under cards */}
        <motion.p
          className="text-xs text-brand-gray-medium text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          All prices include 8.1% Swiss VAT. Business invoices provided at checkout.
        </motion.p>
      </div>

      {/* Footer: Help line and countdown */}
      <div className="flex flex-col items-center gap-6">
        {helpLine && (
          <motion.p
            className="text-sm md:text-base text-black"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {helpLine.text}{' '}
            <Link
              href={helpLine.href}
              className="font-bold text-text-dark underline hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-text-dark focus:ring-offset-2"
            >
              Reach out to us
            </Link>
          </motion.p>
        )}

        {discountEndsAt && (
          <div className="bg-brand-black rounded-3xl px-6 py-2.5">
            <Countdown
              targetDate={discountEndsAt}
              kicker={countdownTitle}
              kickerClassName="!normal-case text-center text-brand-white w-fit mx-auto !mt-0 mb-2 !font-semibold"
            />
          </div>
        )}
      </div>
    </div>
  );
};

