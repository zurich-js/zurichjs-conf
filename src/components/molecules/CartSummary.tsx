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
  onRemoveVoucher,
  className = '',
}) => {
  const hasDiscount = showDiscount && summary.discount > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Subtotal */}
      <div className="flex items-center justify-between text-base">
        <span className="text-gray-400">Subtotal</span>
        <span className="text-white font-semibold">
          {formatPrice(summary.subtotal, summary.currency)}
        </span>
      </div>

      {/* Discount */}
      {hasDiscount && (
        <div className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <span className="text-green-400">Discount</span>
            {voucherCode && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-400 text-xs font-mono rounded">
                {voucherCode}
                {onRemoveVoucher && (
                  <button
                    onClick={onRemoveVoucher}
                    className="hover:text-green-300 transition-colors"
                    aria-label="Remove voucher"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </span>
            )}
          </div>
          <span className="text-green-400 font-semibold">
            -{formatPrice(summary.discount, summary.currency)}
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

