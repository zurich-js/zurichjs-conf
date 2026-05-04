/**
 * CartItem Molecule Component
 * Displays a single cart item with quantity controls and remove button
 */

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import type { CartItem as CartItemType } from '@/types/cart';
import { formatPrice, calculateOrderSummary } from '@/lib/cart';
import { CrownIcon, GraduationCap, MapPin, TicketCheck, Timer, Trash2Icon, Minus, Plus } from "lucide-react";
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';
import { mapVariantToCategory } from '@/lib/analytics/helpers';
import { useCart } from '@/contexts/CartContext';

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
  const { cart } = useCart();
  const totalPrice = item.price * item.quantity;
  const previousQuantity = useRef(item.quantity);
  const isWorkshop = item.kind === 'workshop';

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity !== previousQuantity.current) {
      const orderSummary = calculateOrderSummary(cart);

      // Track quantity change
      analytics.track('cart_quantity_updated', {
        ticket_category: mapVariantToCategory(item.variant),
        ticket_stage: 'general_admission',
        ticket_price: item.price,
        currency: item.currency,
        ticket_count: newQuantity,
        old_quantity: previousQuantity.current,
        new_quantity: newQuantity,
        quantity: newQuantity,
        ticket_type: item.variant || item.title,
        cart_total: orderSummary.total,
      } as EventProperties<'cart_quantity_updated'>);

      previousQuantity.current = newQuantity;
    }
    onQuantityChange(item.id, newQuantity);
  };

  const handleRemove = () => {
    // Track item removal
    analytics.track('ticket_removed_from_cart', {
      ticket_category: mapVariantToCategory(item.variant),
      ticket_stage: 'general_admission',
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
        {/* Item Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="flex gap-4 text-lg font-bold mb-2 text-brand-white">
              <div className="shrink-0 mt-0.5">
                {isWorkshop ? (
                  <GraduationCap size={32} className="stroke-current" />
                ) : item.variant === 'vip' ? (
                  <CrownIcon size={32} className="stroke-brand-yellow-main" />
                ) : item.variant === 'member' ? (
                  <span>m</span>
                ) : (
                  <TicketCheck size={32} className="stroke-current" />
                )}
              </div>
              {isWorkshop ? item.title : `${item.title} Ticket`}
            </h3>

            {/* Remove button */}
            <button
              onClick={handleRemove}
              className="ml-auto -mr-2 shrink-0 group/btn cursor-pointer p-3 rounded-full hover:bg-brand-gray-dark transition-colors duration-300 ease-in-out"
              aria-label={`Remove ${item.title} from cart`}
            >
              <Trash2Icon size={16} className="stroke-brand-gray-light group-hover/btn:stroke-brand-red transition-colors duration-300 ease-in-out" />
            </button>
          </div>

          {isWorkshop && (item.workshopRoom || item.workshopDurationMinutes) && (
            <div className="mb-3 flex flex-wrap gap-3 text-xs text-brand-gray-light">
              {item.workshopDurationMinutes ? (
                <span className="inline-flex items-center gap-1.5">
                  <Timer size={14} className="stroke-brand-gray-light" />
                  {item.workshopDurationMinutes} min
                </span>
              ) : null}
              {item.workshopRoom ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} className="stroke-brand-gray-light" />
                  {item.workshopRoom}
                </span>
              ) : null}
            </div>
          )}

          {/* Quantity and Total */}
          <div className="flex items-center justify-between gap-4">
            {/* Quantity controls — workshops and tickets both support multi-seat. */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleQuantityChange(Math.max(1, item.quantity - 1))}
                disabled={item.quantity <= 1}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-brand-gray-dark hover:bg-brand-gray-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
                aria-label={`Decrease quantity of ${item.title}`}
              >
                <Minus size={16} className="stroke-brand-white" />
              </button>

              <span className="w-10 text-center text-brand-white font-bold tabular-nums">
                {item.quantity}
              </span>

              <button
                onClick={() => handleQuantityChange(Math.min(10, item.quantity + 1))}
                disabled={item.quantity >= 10}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-brand-gray-dark hover:bg-brand-gray-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
                aria-label={`Increase quantity of ${item.title}`}
              >
                <Plus size={16} className="stroke-brand-white" />
              </button>
            </div>
            <span className="sr-only">{isWorkshop ? 'seats' : 'tickets'}</span>

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

