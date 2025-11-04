import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { PriceCard, CTA } from '@/components/molecules/PriceCard';
import { DiscountCountdown } from '@/components/molecules/DiscountCountdown';
import { Feature } from '@/components/molecules/FeatureList';
import { FAQAccordion, FAQItem } from '@/components/molecules/FAQAccordion';

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
   * Optional tax/fees footnote (supports text or React nodes)
   */
  footnote?: React.ReactNode;
  /**
   * Optional badge text (e.g., "Most Popular", "Best Value")
   */
  badge?: string;
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
   * Optional FAQ items to display below pricing
   */
  faq?: FAQItem[];
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
  faq,
  className = '',
}) => {
  // Reorder plans: Standard (left), VIP (center), Super Saver (right)
  const reorderedPlans = React.useMemo(() => {
    const standard = plans.find(p => p.variant === 'standard');
    const vip = plans.find(p => p.variant === 'vip');
    const superSaver = plans.find(p => p.variant === 'member');
    return [standard, vip, superSaver].filter(Boolean) as Plan[];
  }, [plans]);

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

        {/* Price cards - Custom layout with VIP centered and larger */}
        <div className="flex flex-col lg:flex-row gap-6 md:gap-8 mb-8 items-center lg:items-stretch justify-center max-w-7xl mx-auto">
          {reorderedPlans.map((plan, index) => {
            const isVip = plan.variant === 'vip';
            return (
              <div
                key={plan.id}
                className={`w-full ${
                  isVip
                    ? 'lg:w-[420px] lg:scale-110 lg:z-10'
                    : 'lg:w-[360px]'
                }`}
              >
                <PriceCard
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
                  badge={plan.badge}
                  delay={index * 0.06}
                />
              </div>
            );
          })}
        </div>

        {/* VAT transparency - directly under cards */}
        <motion.p
          className="text-xs md:text-sm text-black/70 text-center mt-12 mb-8 md:mt-16 md:mb-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          All prices include 8.1% Swiss VAT. Business invoices provided at checkout.
        </motion.p>

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
            <DiscountCountdown
              discountEndsAt={discountEndsAt}
              className="mt-2"
            />
          )}
        </div>

        {/* FAQ Section */}
        {faq && faq.length > 0 && (
          <motion.div
            className="mt-16 md:mt-20 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-black text-center mb-8 md:mb-12">
              Frequently Asked Questions
            </h2>
            <div className="bg-black rounded-[28px] p-6 md:p-8 shadow-card">
              <FAQAccordion items={faq} />
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

