import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Price } from '@/components/atoms/Price';
import { Button } from '@/components/atoms/Button';
import { FeatureList, Feature } from './FeatureList';
import {CrownIcon} from "lucide-react";
import {Heading} from "@/components/atoms";
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';
import { mapVariantToCategory } from '@/lib/analytics/helpers';

export type CTA =
  | { type: 'link'; href: string; label: string; disabled?: boolean }
  | { type: 'button'; onClick: () => void; label: string; disabled?: boolean; loading?: boolean };

/**
 * Stock availability info
 */
export interface StockInfo {
  /** Remaining tickets (null = unlimited) */
  remaining: number | null;
  /** Total tickets available (null = unlimited) */
  total: number | null;
  /** Whether sold out */
  soldOut: boolean;
}

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
   * Animation delay in seconds
   */
  delay?: number;
  /**
   * Stock availability info
   */
  stock?: StockInfo;
}

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
  delay = 0,
  stock,
}) => {
  const isVip = variant === 'vip';
  const hasLimitedStock = stock?.total !== null && stock?.remaining !== null;

  const handleCTAClick = () => {
    // Track ticket button click
    analytics.track('ticket_button_clicked', {
      button_location: 'price_card',
      ticket_type: title,
      ticket_category: mapVariantToCategory(variant),
      ticket_stage: 'general_admission',
      ticket_price: price,
      currency,
      ticket_count: 1,
      is_sold_out: cta.disabled || false,
    } as EventProperties<'ticket_button_clicked'>);

    // Call original onClick if it's a button
    if (cta.type === 'button') {
      cta.onClick();
    }
  };

  return (
    <motion.article
      id={`plan-${id}`}
      className={`
        flex-1 flex flex-col max-w-screen-xs
        relative bg-brand-black rounded-4xl p-6
        hover:bg-gradient-to-br hover:from-brand-black hover:to-brand-gray-medium/30
        transition-colors duration-500 ease-in-out
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
        // Inner highlight for depth
        boxShadow: isVip
          ? '5px 7px 15px rgba(0,0,0,0.4)'
          : '',
      }}
    >
      <div className="relative z-10 flex flex-col gap-2.5 h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Heading
            level="h3"
            className="text-xl lg:text-lg xl:text-xl font-bold text-brand-white flex gap-2.5 items-center"
          >
            {isVip && (
              <CrownIcon size={32} />
            )}
            {title}
          </Heading>
          {/* VIP remaining stock badge */}
          {isVip && hasLimitedStock && !stock?.soldOut && stock?.remaining && (
            <span className="bg-gray-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              {stock.remaining} left
            </span>
          )}
        </div>
        <div className="flex flex-col gap-4 sm:gap-8">
          {blurb && (
            <p className="text-sm text-brand-gray-lightest leading-relaxed">
              {blurb}
            </p>
          )}

          {/* Price */}
          <div className="mb-6">
            <Price
              amount={price}
              currency={currency}
              compareAmount={comparePrice}
              suffix="/ ticket"
            />
          </div>


          {/* Features */}
          <div className="mb-8 flex-1">
            <FeatureList features={features} variant={variant} />
          </div>

          {/* CTA */}
          <div className="mt-auto">
            {cta.type === 'link' ? (
              <Link href={cta.href} passHref legacyBehavior>
                <Button
                  size="md"
                  variant={variant === 'vip' ? 'accent' : variant === 'member' ? 'outline' : 'primary'}
                  className="w-full"
                  asChild
                  disabled={cta.disabled}
                  onClick={handleCTAClick}
                >
                  {cta.label}
                </Button>
              </Link>
            ) : (
              <Button
                variant={variant === 'vip' ? 'accent' : variant === 'member' ? 'outline' : 'primary'}
                size="md"
                className="w-full"
                onClick={handleCTAClick}
                disabled={cta.disabled}
                loading={cta.loading}
              >
                {cta.label}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
};

