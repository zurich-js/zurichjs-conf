import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heading, Kicker, Button } from '@/components/atoms';
import { TierCard } from '@/components/molecules';
import type { SponsorshipTiersData, TierBenefit } from '@/data/sponsorship';

export interface SponsorshipTiersSectionProps {
  data: SponsorshipTiersData;
  /** Initial currency (from context or server) */
  initialCurrency?: 'CHF' | 'EUR';
  /** Callback when "Become a sponsor" is clicked */
  onBecomeSponsor?: () => void;
}

/**
 * Format price with Swiss-style thousands separator
 */
function formatPrice(price: number): string {
  return price.toLocaleString('de-CH').replace(/,/g, "'");
}

/**
 * Format benefits with correct currency for add-on credits
 */
function formatBenefits(benefits: TierBenefit[], currency: 'CHF' | 'EUR'): { label: string }[] {
  return benefits.map((benefit) => {
    if (benefit.addOnCredit) {
      const amount = formatPrice(benefit.addOnCredit[currency]);
      return { label: `${amount} ${currency} Add-on credit` };
    }
    return { label: benefit.label };
  });
}

/**
 * SponsorshipTiersSection - Sponsorship tiers/pricing section
 *
 * Displays sponsorship tiers in a responsive grid with currency toggle.
 * Uses TierCard molecule for consistent styling with ticket cards.
 */
export const SponsorshipTiersSection: React.FC<SponsorshipTiersSectionProps> = ({
  data,
  initialCurrency = 'CHF',
  onBecomeSponsor,
}) => {
  const [currency, setCurrency] = useState<'CHF' | 'EUR'>(initialCurrency);

  const handleCurrencyChange = (newCurrency: 'CHF' | 'EUR') => {
    setCurrency(newCurrency);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-2 items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Kicker variant="light">{data.kicker}</Kicker>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{
            duration: 0.5,
            delay: 0.1,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Heading
            level="h2"
            variant="light"
            className="text-xl md:text-2xl font-bold"
          >
            {data.title}
          </Heading>
        </motion.div>

        {/* Currency Toggle */}
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <span className="text-xs text-brand-gray-dark">Show prices in</span>
          <div className="flex rounded-full border border-brand-gray-light/30 overflow-hidden">
            <button
              onClick={() => handleCurrencyChange('CHF')}
              className={`px-2.5 py-0.5 text-xs transition-colors cursor-pointer ${
                currency === 'CHF'
                  ? 'bg-brand-gray-dark text-brand-white'
                  : 'bg-transparent text-brand-gray-dark hover:bg-brand-gray-lightest'
              }`}
            >
              CHF
            </button>
            <button
              onClick={() => handleCurrencyChange('EUR')}
              className={`px-2.5 py-0.5 text-xs transition-colors cursor-pointer ${
                currency === 'EUR'
                  ? 'bg-brand-gray-dark text-brand-white'
                  : 'bg-transparent text-brand-gray-dark hover:bg-brand-gray-lightest'
              }`}
            >
              EUR
            </button>
          </div>
        </motion.div>
      </div>

      {/* Tiers Grid - Top row (3 tiers) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.tiers.slice(0, 3).map((tier, index) => (
          <TierCard
            key={tier.id}
            name={tier.name}
            description={tier.description}
            priceDisplay={formatPrice(tier.price[currency])}
            currencyLabel={currency}
            benefits={formatBenefits(tier.benefits, currency)}
            highlighted={tier.highlighted}
            delay={0.1 + index * 0.1}
          />
        ))}
      </div>

      {/* Tiers Grid - Bottom row (3 tiers) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.tiers.slice(3, 6).map((tier, index) => (
          <TierCard
            key={tier.id}
            name={tier.name}
            description={tier.description}
            priceDisplay={formatPrice(tier.price[currency])}
            currencyLabel={currency}
            benefits={formatBenefits(tier.benefits, currency)}
            highlighted={tier.highlighted}
            delay={0.3 + index * 0.1}
          />
        ))}
      </div>

      {/* CTA */}
      <motion.div
        className="flex justify-center mt-2"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Button
          variant="black"
          size="md"
          onClick={onBecomeSponsor}
        >
          {data.cta.label}
        </Button>
      </motion.div>
    </div>
  );
};
