/**
 * CartItem Molecule Component
 * Displays a single cart item with quantity controls and remove button
 */

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import type { CartItem as CartItemType } from '@/types/cart';
import {Input} from '@/components/atoms';
import { formatPrice } from '@/lib/cart';
import {CrownIcon, TicketCheck, Trash2Icon} from "lucide-react";
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';

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
  const previousQuantity = useRef(item.quantity);

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity !== previousQuantity.current) {
      // Track quantity change
      analytics.track('cart_quantity_updated', {
        ticket_category: item.variant as any,
        ticket_stage: 'unknown' as any,
        ticket_price: item.price,
        currency: item.currency,
        ticket_count: newQuantity,
        old_quantity: previousQuantity.current,
        new_quantity: newQuantity,
      } as EventProperties<'cart_quantity_updated'>);

      previousQuantity.current = newQuantity;
    }
    onQuantityChange(item.id, newQuantity);
  };

  const handleRemove = () => {
    // Track item removal
    analytics.track('ticket_removed_from_cart', {
      ticket_category: item.variant as any,
      ticket_stage: 'unknown' as any,
      ticket_price: item.price,
      currency: item.currency,
      ticket_count: item.quantity,
      quantity: item.quantity,
      removal_location: 'cart_review',
    } as EventProperties<'ticket_removed_from_cart'>);

    onRemove(item.id);
  };

  return (
    <motion.div
      className={`relative rounded-xl bg-brand-gray-darkest p-5`}
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

        {/* Item Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="flex gap-4 text-lg font-bold mb-2 text-brand-white">
              <div className="flex-shrink-0 mt-0.5">
                { item.variant === 'vip' ? (
                  <CrownIcon size={32} className="stroke-brand-yellow-main" />
                ) : item.variant === 'member' ? (
                  <span>m</span>
                ) : (
                  <TicketCheck size={32} className="stroke-current" />
                )}
              </div>
              {item.title} Ticket
            </h3>

            {/* Remove button */}
            <button
              onClick={handleRemove}
              className="ml-auto -mr-2.5 flex-shrink-0 group/btn cursor-pointer p-2.5 rounded-full hover:bg-brand-gray-dark transition-colors duration-300 ease-in-out"
              aria-label={`Remove ${item.title} ticket from cart`}
            >
              <Trash2Icon size={16} className="stroke-brand-gray-light group-hover/btn:stroke-brand-red transition-colors duration-300 ease-in-out" />
            </button>
          </div>

          {/* Quantity and Total */}
          <div className="flex items-baseline justify-between gap-4">
            <Input
              type="number"
              value={item.quantity}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const newValue = parseInt(e.target.value, 10);
                if (!isNaN(newValue)) handleQuantityChange(newValue);
              }}
              min={1}
              max={10}
            />

            <div className="text-right">
              <p className="text-lg font-bold text-brand-white">
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

