import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Price } from '@/components/atoms/Price';
import { Button, ButtonVariant } from '@/components/atoms/Button';
import { FeatureList, Feature } from './FeatureList';

export type CTA =
  | { type: 'link'; href: string; label: string; disabled?: boolean }
  | { type: 'button'; onClick: () => void; label: string; disabled?: boolean; loading?: boolean };

export interface PriceCardProps {
  /**
   * Unique identifier
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
   * Compare/original price
   */
  comparePrice?: number;
  /**
   * Current price
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
   * Visual variant affecting styling
   */
  variant?: 'standard' | 'vip' | 'member';
  /**
   * Optional tax/fee footnote (supports text or React nodes)
   */
  footnote?: React.ReactNode;
  /**
   * Optional badge text (e.g., "Most Popular", "Best Value")
   */
  badge?: string;
  /**
   * Animation delay in seconds
   */
  delay?: number;
}

/**
 * Get button styling based on card variant
 */
const getButtonStyles = (
  variant?: string
): {
  className: string;
  variant: ButtonVariant;
  style?: React.CSSProperties;
} => {
  switch (variant) {
    case 'member':
      // Student/Unemployed: yellow filled with black text, fully rounded
      return {
        className: 'bg-brand-primary text-text-dark font-semibold hover:bg-brand-dark shadow-lg hover:shadow-xl rounded-full',
        variant: 'primary',
      };
    case 'vip':
      // VIP: orange filled (#EA561D), fully rounded
      return {
        className: 'font-semibold shadow-lg hover:shadow-xl rounded-full',
        style: { backgroundColor: '#EA561D', color: '#FFFFFF' },
        variant: 'primary',
      };
    default:
      // Standard: outline with transparent and white text, fully rounded
      return {
        className: 'bg-transparent text-white border-2 border-white font-semibold hover:bg-white hover:text-text-dark rounded-full',
        variant: 'ghost',
      };
  }
};

/**
 * PriceCard component displays a pricing tier with title, price, features, and CTA
 * Supports different variants with appropriate styling and animations
 */
export const PriceCard: React.FC<PriceCardProps> = ({
  id,
  title,
  blurb,
  comparePrice,
  price,
  currency,
  features,
  cta,
  variant = 'standard',
  footnote,
  badge,
  delay = 0,
}) => {
  const isVip = variant === 'vip';
  const buttonStyles = getButtonStyles(variant);

  // VIP card gets a subtle border highlight
  const borderClass = isVip
    ? 'border-2 border-vip/30'
    : 'border border-gray-800';

  const cardContent = (
    <div className="flex flex-col h-full">
      {/* Badge */}
      {badge && (
        <div className="mb-4">
          <span className="inline-block bg-brand-primary text-text-dark text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
            {badge}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">
          {title}
        </h3>
        {blurb && (
          <p className="text-sm md:text-base text-text-muted leading-relaxed">
            {blurb}
          </p>
        )}
      </div>

      {/* Price */}
      <div className="mb-6">
        <Price
          amount={price}
          currency={currency}
          compareAmount={comparePrice}
          suffix="/ ticket"
          variant="large"
        />
        {footnote && (
          <p className="text-xs text-gray-500 mt-2">
            {footnote}
          </p>
        )}
      </div>

      {/* Features */}
      <div className="mb-8 flex-1">
        <FeatureList features={features} />
      </div>

      {/* CTA */}
      <div className="mt-auto">
        {cta.type === 'link' ? (
          <Link href={cta.href} passHref legacyBehavior>
            <Button
              variant={buttonStyles.variant}
              size="lg"
              className={`w-full ${buttonStyles.className}`}
              style={buttonStyles.style}
              asChild
              disabled={cta.disabled}
            >
              {cta.label}
            </Button>
          </Link>
        ) : (
          <Button
            variant={buttonStyles.variant}
            size="lg"
            className={`w-full ${buttonStyles.className}`}
            style={buttonStyles.style}
            onClick={cta.onClick}
            disabled={cta.disabled}
            loading={cta.loading}
          >
            {cta.label}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <motion.article
      id={`plan-${id}`}
      className={`
        relative bg-black rounded-[28px] p-6 md:p-8
        shadow-card
        ${borderClass}
        flex flex-col h-full
      `}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{
        scale: 1.01,
        boxShadow: '0 15px 35px rgba(0, 0, 0, 0.35)',
      }}
      style={{
        // Inner highlight for depth
        boxShadow: isVip
          ? '0 10px 25px rgba(0,0,0,0.25), inset 0 1px 0 rgba(242,106,60,0.1)'
          : '0 10px 25px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* VIP spotlight effect */}
      {isVip && (
        <div
          className="absolute inset-0 rounded-[28px] pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(242,106,60,0.08) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />
      )}

      <div className="relative z-10 flex flex-col h-full">
        {cardContent}
      </div>
    </motion.article>
  );
};

