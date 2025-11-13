/**
 * CartSummary Molecule Component
 * Displays cart totals with breakdown (subtotal, discount, tax, total)
 */

import React from 'react';
import type { OrderSummary } from '@/types/cart';
import { formatPrice } from '@/lib/cart';
import {CirclePercentIcon, XIcon} from "lucide-react";

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
    <div className={`flex flex-col gap-5 ${className}`}>

      <div className="flex flex-col gap-2.5">
        {/* Subtotal */}
        <div className="flex items-center justify-between text-base">
          <span className="text-brand-gray-light">Subtotal</span>
          <span className="text-brand-white font-semibold">
          {formatPrice(summary.subtotal, summary.currency)}
        </span>
        </div>

        {/* Discount */}
        {hasDiscount && (
          <div className="flex items-center justify-between text-base gap-2">
            <span className="text-brand-green text-sm">{getDiscountLabel()}</span>
            <span className="text-brand-green font-semibold tabular-nums shrink-0">
            <span className="mr-0.5">−</span>{formatPrice(summary.discount, summary.currency)}
          </span>
          </div>
        )}
        {voucherCode && (
          <button
            className="ml-auto inline-flex items-center cursor-pointer gap-1.5 px-3 py-1.5 border-2 border-brand-gray-dark text-brand-green text-sm font-mono rounded-lg group/btn"
            aria-label="Remove voucher"
            onClick={onRemoveVoucher}
          >
            <CirclePercentIcon size={14} className="stroke-current" />
            {voucherCode}
            <XIcon size={16} className="stroke-brand-gray-medium group-hover/btn:stroke-brand-red group-focus/btn:stroke-brand-red" />
          </button>
        )}

        {/* Tax */}
        {showTax && summary.tax > 0 && (
          <div className="flex items-center justify-between text-base">
            <span className="text-brand-gray-light">Tax (8.1% Swiss VAT)</span>
            <span className="text-brand-white font-semibold">
            {formatPrice(summary.tax, summary.currency)}
          </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-lg font-bold text-brand-white">Total</span>
        <span className="text-xl font-bold text-brand-yellow-main">
          {formatPrice(summary.total, summary.currency)}
        </span>
      </div>

      {/* Tax Note */}
      {showTax && (
        <p className="text-xs text-brand-gray-medium text-center">
          All prices include Swiss VAT. Business invoices provided at checkout.
        </p>
      )}
    </div>
  );
};

