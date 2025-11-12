import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Price } from '@/components/atoms/Price';
import { Button } from '@/components/atoms/Button';
import { FeatureList, Feature } from './FeatureList';
import {CrownIcon} from "lucide-react";
import {Heading} from "@/components/atoms";

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
   * Animation delay in seconds
   */
  delay?: number;
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
}) => {
  const isVip = variant === 'vip';

  return (
    <motion.article
      id={`plan-${id}`}
      className={`
        flex-1 flex flex-col
        relative bg-brand-black rounded-4xl p-6
        hover:bg-gradient-to-br hover:from-brand-black hover:to-brand-gray-medium/50
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
        <Heading
          level="h3"
          className="text-xl font-bold text-brand-white flex gap-2.5 items-center"
        >
          {isVip && (
            <CrownIcon size={32} />
          )}
          {title}
        </Heading>
        <div className="flex flex-col gap-8">
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
                  variant={variant === 'vip' ? 'accent' : variant === 'member' ? 'ghost' : 'primary'}
                  className="w-full"
                  asChild
                  disabled={cta.disabled}
                >
                  {cta.label}
                </Button>
              </Link>
            ) : (
              <Button
                variant={variant === 'vip' ? 'accent' : variant === 'member' ? 'ghost' : 'primary'}
                size="md"
                className="w-full"
                onClick={cta.onClick}
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

