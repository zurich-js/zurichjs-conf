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
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Format price using Intl.NumberFormat with proper currency formatting
 */
const formatPrice = (amount: number, currency: string): string => {
  try {
    return  new Intl.NumberFormat('en-CH', {
      style: 'decimal',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback if currency is invalid
    return amount.toLocaleString();
  }
};

/**
 * Price component with optional compare pricing and formatting
 */
export const Price: React.FC<PriceProps> = ({
                                              amount,
                                              currency,
                                              compareAmount,
                                              suffix,
                                              className = '',
                                            }) => {
  const formattedPrice = formatPrice(amount, currency);
  const formattedComparePrice = compareAmount ? formatPrice(compareAmount, currency) : null;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {compareAmount && formattedComparePrice && (
        <p
          className="relative isolate flex gap-1 items-end text-brand-gray-light w-fit"
          aria-label={`Original price: ${formattedComparePrice}`}
        >
          <small className="font-light text-sm leading-none">{currency}</small>
          <span className="text-lg leading-none">{formattedComparePrice}</span>
          <span className="absolute block w-full h-px left-0 top-1/2 bg-current -rotate-12" />
        </p>
      )}

      <p
        className="relative flex gap-1 items-baseline text-brand-white"
        aria-label={`Original price: ${formattedPrice}`}
      >
        <small className="font-light text-lg leading-none">{currency}</small>
        <span className="text-2xl leading-none font-bold">{formattedPrice}</span>
        {suffix && (
          <small className="text-sm leading-none">
            {suffix}
          </small>
        )}
      </p>
    </div>
  );
};

