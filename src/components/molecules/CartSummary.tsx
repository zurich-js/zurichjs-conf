/**
 * CartSummary Molecule Component
 * Displays cart totals with breakdown (subtotal, discount, tax, total)
 */

import React from 'react';
import type { OrderSummary } from '@/types/cart';
import { formatPrice } from '@/lib/cart';

export interface CartSummaryProps {
  /**
   * Order summary data
   */
  summary: OrderSummary;
  /**
   * Whether to show tax breakdown
   */
  showTax?: boolean;
  /**
   * Whether to show discount line
   */
  showDiscount?: boolean;
  /**
   * Applied voucher code (if any)
   */
  voucherCode?: string;
  /**
   * Discount type (percentage or fixed amount)
   */
  discountType?: 'percentage' | 'fixed';
  /**
   * Original discount value (percentage number or fixed amount)
   */
  discountValue?: number;
  /**
   * Callback to remove voucher
   */
  onRemoveVoucher?: () => void;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * CartSummary component
 * Displays order breakdown with subtotal, discounts, tax, and total
 */
export const CartSummary: React.FC<CartSummaryProps> = ({
  summary,
  showTax = true,
  showDiscount = true,
  voucherCode,
  discountType,
  discountValue,
  onRemoveVoucher,
  className = '',
}) => {
  const hasDiscount = showDiscount && summary.discount > 0;

  // Generate discount label based on type and value
  const getDiscountLabel = () => {
    if (!discountType || !discountValue) {
      return 'Discount';
    }

    if (discountType === 'percentage') {
      return `${discountValue}% discount`;
    } else if (discountType === 'fixed') {
      return 'Discount';
    }

    return 'Discount';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Applied Coupon Code - Show at the top */}
      {voucherCode && (
        <div className="pb-3 border-b border-gray-800">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Applied Code</span>
            {onRemoveVoucher && (
              <button
                onClick={onRemoveVoucher}
                className="text-xs text-gray-400 hover:text-red-400 transition-colors cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center gap-1"
                aria-label="Remove voucher"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Remove
              </button>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-mono rounded-lg">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {voucherCode}
          </span>
        </div>
      )}

      {/* Subtotal */}
      <div className="flex items-center justify-between text-base">
        <span className="text-gray-400">Subtotal</span>
        <span className="text-white font-semibold">
          {formatPrice(summary.subtotal, summary.currency)}
        </span>
      </div>

      {/* Discount */}
      {hasDiscount && (
        <div className="flex items-center justify-between text-base gap-2">
          <span className="text-green-400 text-sm">{getDiscountLabel()}</span>
          <span className="text-green-400 font-semibold tabular-nums shrink-0">
            <span className="mr-0.5">−</span>{formatPrice(summary.discount, summary.currency)}
          </span>
        </div>
      )}

      {/* Tax */}
      {showTax && summary.tax > 0 && (
        <div className="flex items-center justify-between text-base">
          <span className="text-gray-400">Tax (8.1% Swiss VAT)</span>
          <span className="text-white font-semibold">
            {formatPrice(summary.tax, summary.currency)}
          </span>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-gray-800 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-white">Total</span>
          <span className="text-2xl font-bold text-brand-primary">
            {formatPrice(summary.total, summary.currency)}
          </span>
        </div>
      </div>

      {/* Tax Note */}
      {showTax && (
        <p className="text-xs text-gray-500 text-center">
          All prices include Swiss VAT. Business invoices provided at checkout.
        </p>
      )}
    </div>
  );
};

