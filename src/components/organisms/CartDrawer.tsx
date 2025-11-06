/**
 * CartDrawer Organism Component
 * Sliding drawer that displays cart contents, summary, and checkout button
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { useCart } from '@/contexts/CartContext';
import { CartItem } from '@/components/molecules';
import { Button } from '@/components/atoms';
import { calculateOrderSummary } from '@/lib/cart';

export interface CartDrawerProps {
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * CartDrawer component
 * Displays a sliding drawer with cart contents from the right side
 */
export const CartDrawer: React.FC<CartDrawerProps> = ({ className = '' }) => {
  const router = useRouter();
  const {
    cart,
    isCartOpen,
    closeCart,
    updateItemQuantity,
    removeFromCart,
  } = useCart();

  const orderSummary = calculateOrderSummary(cart);
  const isEmpty = cart.items.length === 0;

  const handleViewCart = () => {
    closeCart();
    router.push('/cart');
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeCart();
    }
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
          />

          {/* Drawer */}
          <motion.div
            className={`fixed top-0 right-0 h-full w-full sm:w-[450px] lg:w-[500px] bg-surface-section z-50 shadow-2xl flex flex-col ${className}`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div>
                <h2 className="text-2xl font-bold text-white">Your Cart</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {isEmpty ? 'No items yet' : `${cart.totalItems} item${cart.totalItems !== 1 ? 's' : ''}`}
                </p>
              </div>
              <button
                onClick={closeCart}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary"
                aria-label="Close cart"
              >
                <svg
                  className="w-5 h-5 text-white"
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
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isEmpty ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                    <svg
                      className="w-12 h-12 text-gray-600"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Your cart is empty</h3>
                  <p className="text-gray-400 mb-6">
                    Add tickets to get started
                  </p>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={closeCart}
                    className="bg-brand-primary text-black hover:bg-brand-dark cursor-pointer"
                  >
                    Browse Tickets
                  </Button>
                </div>
              ) : (
                /* Cart Items */
                <div className="space-y-6">
                  {/* Items List */}
                  <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                      {cart.items.map((item, index) => (
                        <CartItem
                          key={item.id}
                          item={item}
                          onQuantityChange={updateItemQuantity}
                          onRemove={removeFromCart}
                          delay={index * 0.05}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with Quick Summary and View Cart */}
            {!isEmpty && (
              <div className="border-t border-gray-800 p-6 bg-black">
                <div className="space-y-4">
                  {/* Quick Summary */}
                  <div className="flex items-center justify-between text-lg">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="text-white font-bold">
                      {new Intl.NumberFormat('en-CH', {
                        style: 'currency',
                        currency: cart.currency,
                      }).format(orderSummary.subtotal)}
                    </span>
                  </div>

                  {/* View Cart Button */}
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleViewCart}
                    className="w-full bg-brand-primary text-black hover:bg-brand-dark font-bold text-lg cursor-pointer"
                  >
                    View Cart & Checkout
                  </Button>

                  {/* Continue Shopping */}
                  <button
                    onClick={closeCart}
                    className="w-full text-center text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

