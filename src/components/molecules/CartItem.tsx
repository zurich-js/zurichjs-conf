/**
 * CartItem Molecule Component
 * Displays a single cart item with quantity controls and remove button
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { CartItem as CartItemType } from '@/types/cart';
import { QuantitySelector } from '@/components/atoms';
import { formatPrice } from '@/lib/cart';

export interface CartItemProps {
  /**
   * Cart item data
   */
  item: CartItemType;
  /**
   * Callback when quantity changes
   */
  onQuantityChange: (itemId: string, quantity: number) => void;
  /**
   * Callback when item is removed
   */
  onRemove: (itemId: string) => void;
  /**
   * Animation delay in seconds
   */
  delay?: number;
}

/**
 * CartItem component
 * Displays cart item with image, title, price, quantity selector, and remove button
 */
export const CartItem: React.FC<CartItemProps> = ({
  item,
  onQuantityChange,
  onRemove,
  delay = 0,
}) => {
  const totalPrice = item.price * item.quantity;

  // Variant-based styling
  const variantColors = {
    standard: 'border-gray-700',
    vip: 'border-vip/30',
    member: 'border-brand-primary/30',
  };

  const borderColor = item.variant ? variantColors[item.variant] : variantColors.standard;

  return (
    <motion.div
      className={`relative bg-black rounded-xl p-4 border ${borderColor}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{
        duration: 0.3,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="flex gap-4">
        {/* Ticket Icon/Badge */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center">
            <svg
              className="w-8 h-8 text-brand-primary"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
        </div>

        {/* Item Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">
                {item.title} Ticket
              </h3>
              <p className="text-sm text-gray-400">
                {formatPrice(item.price, item.currency)} per ticket
              </p>
            </div>

            {/* Remove button */}
            <button
              onClick={() => onRemove(item.id)}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-red-500/20 hover:text-red-400 text-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black"
              aria-label={`Remove ${item.title} ticket from cart`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          {/* Quantity and Total */}
          <div className="flex items-center justify-between gap-4">
            <QuantitySelector
              value={item.quantity}
              onChange={(quantity) => onQuantityChange(item.id, quantity)}
              min={1}
              max={10}
              size="sm"
            />

            <div className="text-right">
              <p className="text-lg font-bold text-white">
                {formatPrice(totalPrice, item.currency)}
              </p>
              {item.quantity > 1 && (
                <p className="text-xs text-gray-500">
                  {item.quantity} × {formatPrice(item.price, item.currency)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

