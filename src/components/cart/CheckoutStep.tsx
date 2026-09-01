/**
 * Cart Checkout Step Component
 * Step 4: Payment form and final order summary
 */

import { motion } from 'framer-motion';
import { AlertCircle, TicketXIcon } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { extractFieldErrors, hasFieldErrors } from '@/lib/api/validation-errors';
import { CartSummary } from '@/components/molecules';
import { CheckoutForm } from '@/components/organisms';
import { mapCartItemsToAnalytics } from '@/lib/analytics/helpers';
import type { CheckoutStepProps, CartItem } from './types';

export function CheckoutStep({
  cart,
  orderSummary,
  attendees,
  isPartialDiscount,
  needsAttendeeInfo,
  isSubmitting,
  error,
  onBack,
  onRemove,
  onRemoveVoucher,
  onSubmit,
  onEmailCaptured,
  onFieldCaptured,
  savedBillingData,
}: CheckoutStepProps) {
  // When the attendee step is skipped, the billing contact is the sole ticket
  // holder — collect their apparel sizes here instead.
  const ticketItems = cart.items.filter((item) => item.kind !== 'workshop');
  const apparel = !needsAttendeeInfo && ticketItems.length > 0
    ? { hoodie: ticketItems.some((item) => item.variant === 'vip') }
    : undefined;

  return (
    <motion.div
      key="checkout"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-4 lg:gap-8">
          {/* Billing Form */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <h1 className="text-xl font-bold text-brand-white mb-6">Complete Registration</h1>
            {error && (() => {
              // Mirror PaymentStep's failure surface: the real message, a
              // support path, and the requestId that pins the server trace
              // when the user screenshots this.
              const requestId = error instanceof ApiError ? error.requestId : undefined;
              const mailtoSubject = encodeURIComponent(
                `Checkout problem${requestId ? ` (ref ${requestId})` : ''}`
              );
              // Server-side Zod 400s carry per-field issues — list them so the
              // user knows WHICH field to fix instead of just "Validation failed".
              const fieldErrors = hasFieldErrors(error) ? extractFieldErrors(error) : null;
              return (
                <div
                  className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4"
                  role="alert"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="text-red-400 text-sm font-medium">{error.message}</p>
                      {fieldErrors && (
                        <ul className="mt-2 space-y-0.5 text-xs text-red-400/90 list-disc list-inside">
                          {Object.entries(fieldErrors.fields).map(([field, message]) => (
                            <li key={field}>
                              <span className="font-medium">{field}</span>: {message}
                            </li>
                          ))}
                          {fieldErrors.formErrors.map((message) => (
                            <li key={message}>{message}</li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-2 text-xs text-brand-gray-light">
                        You have not been charged. Please try again — if it keeps failing,
                        contact{' '}
                        <a
                          href={`mailto:hello@zurichjs.com?subject=${mailtoSubject}`}
                          className="underline hover:text-brand-yellow-main"
                        >
                          hello@zurichjs.com
                        </a>
                        {requestId && (
                          <>
                            {' '}and mention reference <span className="font-mono">{requestId}</span>
                          </>
                        )}
                        .
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
            <CheckoutForm
              onSubmit={onSubmit}
              apparel={apparel}
              isSubmitting={isSubmitting}
              totalAmount={orderSummary.total.toFixed(2)}
              currency={orderSummary.currency}
              onBack={onBack || (() => {})}
              defaultValues={savedBillingData ?? (attendees.length > 0 ? {
                firstName: attendees[0].firstName,
                lastName: attendees[0].lastName,
                email: attendees[0].email,
                company: attendees[0].company || '',
                jobTitle: attendees[0].jobTitle || '',
              } : undefined)}
              cartData={{
                cart_item_count: cart.items.length,
                cart_total_amount: orderSummary.total,
                cart_currency: orderSummary.currency,
                cart_items: mapCartItemsToAnalytics(cart.items),
              }}
              onEmailCaptured={onEmailCaptured}
              onFieldCaptured={onFieldCaptured}
            />
          </div>

          {/* Order Summary — shown at top on mobile */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="sticky top-16 lg:top-24">
              <div className="bg-brand-gray-darkest border border-brand-gray-dark rounded-2xl p-5 sm:p-6 space-y-4">
                <h2 className="text-lg font-bold text-brand-white">Order Summary</h2>
                <div className="space-y-3 border-b border-brand-gray-dark pb-4">
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
      </div>
    </motion.div>
  );
}
