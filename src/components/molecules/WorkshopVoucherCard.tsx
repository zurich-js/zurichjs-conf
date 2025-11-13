/**
 * WorkshopVoucherCard molecule component
 * Displays a workshop voucher with bonus value for early purchasers
 */

import React from 'react';
import { motion } from 'framer-motion';

export interface WorkshopVoucherCardProps {
  /**
   * Base voucher amount
   */
  amount: number;
  /**
   * Bonus percentage (25 for 25%, 15 for 15%)
   */
  bonusPercent: number;
  /**
   * Currency code
   */
  currency: string;
  /**
   * Click handler
   */
  onClick: () => void;
  /**
   * Whether the card is in a loading state
   */
  isLoading?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Workshop voucher card component
 */
export const WorkshopVoucherCard: React.FC<WorkshopVoucherCardProps> = ({
  amount,
  bonusPercent,
  currency,
  onClick,
  isLoading = false,
  className = '',
}) => {
  const bonusAmount = (amount * bonusPercent) / 100;
  const totalValue = amount + bonusAmount;

  return (
    <motion.button
      onClick={onClick}
      disabled={isLoading}
      className={`
        relative overflow-hidden w-full
        bg-black border-2 border-brand-primary/20
        hover:border-brand-primary/50
        rounded-xl p-4
        text-left
        transition-all duration-200
        cursor-pointer
        hover:shadow-lg
        active:scale-[0.99]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Value Proposition */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xl font-black text-brand-white">
              {amount} {currency}
            </span>
            <span className="text-sm text-gray-400">→</span>
            <span className="text-xl font-black text-brand-primary">
              {totalValue} {currency}
            </span>
          </div>
          <div className="text-sm text-gray-400">
            <span className="font-semibold text-brand-primary">+{bonusPercent}%</span> bonus credit
          </div>
        </div>

        {/* Add button */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-black"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
        </div>
      </div>
    </motion.button>
  );
};

