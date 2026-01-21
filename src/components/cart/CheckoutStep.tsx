/**
 * Cart Checkout Step Component
 * Step 4: Payment form and final order summary
 */

import { motion } from 'framer-motion';
import { TicketXIcon } from 'lucide-react';
import { CartSummary } from '@/components/molecules';
import { CheckoutForm } from '@/components/organisms';
import { mapCartItemsToAnalytics } from '@/lib/analytics/helpers';
import type { CheckoutStepProps, CartItem } from './types';

export function CheckoutStep({
  cart,
  orderSummary,
  attendees,
  isPartialDiscount,
  isSubmitting,
  error,
  onBack,
  onRemove,
  onRemoveVoucher,
  onSubmit,
  onEmailCaptured,
}: CheckoutStepProps) {
  return (
    <motion.div
      key="checkout"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <h1 className="text-xl font-bold text-brand-white mb-6">Complete Registration</h1>
            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 text-sm">{error.message}</p>
              </div>
            )}
            <CheckoutForm
              onSubmit={onSubmit}
              isSubmitting={isSubmitting}
              totalAmount={orderSummary.total.toFixed(2)}
              currency={orderSummary.currency}
              onBack={onBack || (() => {})}
              defaultValues={attendees.length > 0 ? {
                firstName: attendees[0].firstName,
                lastName: attendees[0].lastName,
                email: attendees[0].email,
                company: attendees[0].company || '',
                jobTitle: attendees[0].jobTitle || '',
              } : undefined}
              cartData={{
                cart_item_count: cart.items.length,
                cart_total_amount: orderSummary.total,
                cart_currency: orderSummary.currency,
                cart_items: mapCartItemsToAnalytics(cart.items),
              }}
              onEmailCaptured={onEmailCaptured}
            />
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <h2 className="text-lg font-bold text-brand-white mb-4">Order Summary</h2>
              <div className="space-y-3 mb-6">
                {cart.items.map((item: CartItem) => (
                  <div key={item.id} className="flex justify-between text-sm gap-3">
                    <div className="flex-1">
                      <div className="text-brand-white font-medium">{item.title}</div>
                      <div className="text-brand-gray-light">Qty: {item.quantity}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-brand-white font-semibold">
                        {(item.price * item.quantity).toFixed(2)} {item.currency}
                      </div>
                      <button
                        onClick={() => onRemove(item.id)}
                        className="text-brand-red/70 hover:text-brand-red transition-colors duration-200 flex items-center gap-1 text-xs"
                        aria-label={`Remove ${item.title} from cart`}
                      >
                        <TicketXIcon size={14} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <CartSummary
                summary={orderSummary}
                showTax={false}
                showDiscount={true}
                voucherCode={cart.couponCode}
                discountType={cart.discountType}
                discountValue={cart.discountValue}
                isPartialDiscount={isPartialDiscount}
                onRemoveVoucher={onRemoveVoucher}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
