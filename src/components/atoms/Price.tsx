import React from 'react';

export interface PriceProps {
  /**
   * Price amount in the currency's base unit (e.g., 699 for CHF 699)
   */
  amount: number;
  /**
   * Currency code
   */
  currency: 'CHF' | 'EUR' | 'USD' | string;
  /**
   * Optional compare price to show as strikethrough
   */
  compareAmount?: number;
  /**
   * Show per-unit suffix (e.g., "/ ticket")
   */
  suffix?: string;
  /**
   * Display variant
   */
  variant?: 'large' | 'small';
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Format price using Intl.NumberFormat with proper currency formatting
 */
const formatPrice = (amount: number, currency: string): string => {
  try {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback if currency is invalid
    return `${currency} ${amount.toLocaleString()}`;
  }
};

/**
 * Calculate savings percentage
 */
const calculateSavingsPercent = (compareAmount: number, currentAmount: number): number => {
  if (compareAmount <= currentAmount) return 0;
  return Math.round(((compareAmount - currentAmount) / compareAmount) * 100);
};

/**
 * Price component with optional compare pricing and formatting
 */
export const Price: React.FC<PriceProps> = ({
  amount,
  currency,
  compareAmount,
  suffix,
  variant = 'large',
  className = '',
}) => {
  const formattedPrice = formatPrice(amount, currency);
  const formattedComparePrice = compareAmount ? formatPrice(compareAmount, currency) : null;
  const savingsPercent = compareAmount ? calculateSavingsPercent(compareAmount, amount) : 0;

  const priceSize = variant === 'large' ? 'text-4xl md:text-5xl' : 'text-2xl md:text-3xl';
  const suffixSize = variant === 'large' ? 'text-base md:text-lg' : 'text-sm md:text-base';

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {compareAmount && formattedComparePrice && (
        <div className="flex items-center gap-2">
          <span
            className="text-text-muted line-through text-lg"
            aria-label={`Original price: ${formattedComparePrice}`}
          >
            {formattedComparePrice}
          </span>
          {savingsPercent > 0 && (
            <span className="text-success-light text-sm font-semibold bg-success/10 px-2 py-1 rounded">
              Save {savingsPercent}%
            </span>
          )}
        </div>
      )}
      
      <div className="flex items-baseline gap-2">
        <span
          className={`font-bold text-text-primary ${priceSize}`}
          aria-label={`Current price: ${formattedPrice}${suffix || ''}`}
        >
          {formattedPrice}
        </span>
        {suffix && (
          <span className={`text-text-muted ${suffixSize}`}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};

