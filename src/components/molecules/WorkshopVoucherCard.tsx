/**
 * WorkshopVoucherCard molecule component
 * Displays a workshop voucher with bonus value for early purchasers
 */

import React from 'react';
import { motion } from 'framer-motion';
import { MinusIcon } from 'lucide-react';

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
   * Click handler to add voucher
   */
  onClick: () => void;
  /**
   * Current quantity in cart
   */
  quantity?: number;
  /**
   * Click handler to remove voucher
   */
  onRemove?: () => void;
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
  quantity = 0,
  onRemove,
  isLoading = false,
  className = '',
}) => {
  const bonusAmount = (amount * bonusPercent) / 100;
  const totalValue = amount + bonusAmount;
  const isInCart = quantity > 0;

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
  };

  return (
    <motion.div
      className={`
        relative overflow-hidden w-full
        bg-black border-2 ${isInCart ? 'border-brand-primary' : 'border-brand-primary/20'}
        ${!isInCart && 'hover:border-brand-primary/50'}
        rounded-xl p-4
        text-left
        transition-all duration-200
        ${!isInCart && 'hover:shadow-lg'}
        ${className}
      `}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Value Proposition */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-lg font-bold text-brand-white">
              {amount} {currency}
            </span>
            <span className="text-sm text-gray-400">→</span>
            <span className="text-lg font-bold text-brand-primary">
              {totalValue} {currency}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {isInCart ? (
            <>
              {/* Quantity display */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-brand-primary">
                  Qty: {quantity}
                </span>
                {/* Remove button */}
                <button
                  onClick={handleRemove}
                  disabled={isLoading}
                  className="w-10 h-10 bg-brand-red/10 hover:bg-brand-red/20 border border-brand-red/50 rounded-lg flex items-center justify-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Remove from cart"
                >
                  <MinusIcon size={20} className="text-brand-red" />
                </button>
              </div>
            </>
          ) : (
            /* Add button */
            <motion.button
              onClick={onClick}
              disabled={isLoading}
              className="w-10 h-10 bg-brand-primary hover:bg-brand-primary/90 rounded-lg flex items-center justify-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              whileTap={{ scale: 0.95 }}
              aria-label="Add to cart"
            >
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
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

