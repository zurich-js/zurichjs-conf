/**
 * Cart Page
 * Simplified multi-step cart flow with TanStack Query integration
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
import { useTicketPricing } from '@/hooks/useTicketPricing';
import { useCheckout } from '@/hooks/useCheckout';
import { useToast } from '@/hooks/useToast';
import { CartItem, CartSummary, VoucherInput, WorkshopVoucherCard, ToastContainer } from '@/components/molecules';
import { Button } from '@/components/atoms';
import { PageHeader, CheckoutForm } from '@/components/organisms';
import { calculateOrderSummary } from '@/lib/cart';
import type { CheckoutFormData } from '@/types/cart';
import Head from 'next/head';
import Link from 'next/link';

type CartStep = 'review' | 'upsells' | 'checkout';

export default function CartPage() {
  const {
    cart,
    updateItemQuantity,
    removeFromCart,
    applyVoucher,
    removeVoucher,
    addToCart,
  } = useCart();

  const { currentStage } = useTicketPricing();
  const [currentStep, setCurrentStep] = useState<CartStep>('review');
  const { mutate: createCheckout, isPending: isSubmitting, error } = useCheckout();
  const { toasts, showToast } = useToast();

  const orderSummary = calculateOrderSummary(cart);
  const isEmpty = cart.items.length === 0;

  // Workshop upsell logic
  const showWorkshopUpsells = currentStage === 'blind_bird' || currentStage === 'early_bird';
  const bonusPercent = currentStage === 'blind_bird' ? 25 : currentStage === 'early_bird' ? 15 : 0;
  const workshopVoucherAmounts = [50, 75, 100, 150, 200];

  const handleAddWorkshopVoucher = (amount: number) => {
    const bonusAmount = (amount * bonusPercent) / 100;
    const totalValue = amount + bonusAmount;

    addToCart({
      id: `workshop-voucher-${amount}`,
      title: `Workshop Voucher (+${bonusPercent}% bonus)`,
      price: amount,
      currency: cart.currency || 'CHF',
      priceId: `workshop_voucher_${amount}`,
      variant: 'standard',
    }, 1);

    showToast(`Added ${totalValue} ${cart.currency || 'CHF'} workshop credit to cart!`, 'success');
  };

  const handleCheckoutSubmit = (data: CheckoutFormData) => {
    createCheckout({
      cart,
      customerInfo: data,
    });
  };

  const handleContinueFromReview = () => {
    if (showWorkshopUpsells) {
      setCurrentStep('upsells');
    } else {
      setCurrentStep('checkout');
    }
  };

  // Empty cart state
  if (isEmpty) {
    return (
      <>
        <Head>
          <title>Your Cart is Empty | ZurichJS Conference 2026</title>
        </Head>

        <PageHeader />

        <div className="min-h-screen bg-surface-section flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
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
            <h1 className="text-3xl font-bold text-white mb-3">Your Cart is Empty</h1>
            <p className="text-gray-400 mb-8">
              Start adding tickets to your cart to get started.
            </p>
            <Link href="/#tickets">
              <Button
                variant="primary"
                size="lg"
                className="bg-brand-primary text-black hover:bg-brand-dark cursor-pointer"
              >
                Browse Tickets
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Your Cart | ZurichJS Conference 2026</title>
      </Head>

      <div className="min-h-screen bg-surface-section">
        {/* Header with cart count */}
        <PageHeader
          rightContent={
            <span className="text-sm text-gray-400">
              {cart.totalItems} item{cart.totalItems !== 1 ? 's' : ''}
            </span>
          }
        />

        {/* Progress Steps */}
        <div className="bg-black/50 border-b border-gray-800">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-center gap-2 sm:gap-4 max-w-2xl mx-auto">
              {/* Step 1 */}
              <button
                onClick={() => setCurrentStep('review')}
                className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
                aria-label="Go to Review Cart step"
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                  currentStep === 'review' ? 'bg-brand-primary text-black' : 'bg-gray-800 text-gray-400'
                }`}>
                  1
                </div>
                <span className={`ml-2 sm:ml-3 text-xs sm:text-sm font-medium transition-colors ${
                  currentStep === 'review' ? 'text-white' : 'text-gray-400'
                }`}>
                  Review
                </span>
              </button>

              {/* Connector */}
              <div className="w-8 sm:w-16 h-0.5 bg-gray-800"></div>

              {/* Step 2 (conditional) */}
              {showWorkshopUpsells && (
                <>
                  <button
                    onClick={() => setCurrentStep('upsells')}
                    className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
                    aria-label="Go to Workshop Upsells step"
                  >
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                      currentStep === 'upsells' ? 'bg-brand-primary text-black' : 'bg-gray-800 text-gray-400'
                    }`}>
                      2
                    </div>
                    <span className={`ml-2 sm:ml-3 text-xs sm:text-sm font-medium transition-colors ${
                      currentStep === 'upsells' ? 'text-white' : 'text-gray-400'
                    }`}>
                      Workshops
                    </span>
                  </button>

                  <div className="w-8 sm:w-16 h-0.5 bg-gray-800"></div>
                </>
              )}

              {/* Step 3 */}
              <button
                onClick={() => setCurrentStep('checkout')}
                className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
                aria-label="Go to Checkout step"
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                  currentStep === 'checkout' ? 'bg-brand-primary text-black' : 'bg-gray-800 text-gray-400'
                }`}>
                  {showWorkshopUpsells ? '3' : '2'}
                </div>
                <span className={`ml-2 sm:ml-3 text-xs sm:text-sm font-medium transition-colors ${
                  currentStep === 'checkout' ? 'text-white' : 'text-gray-400'
                }`}>
                  Checkout
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <AnimatePresence mode="wait">
            {/* Step 1: Review Cart */}
            {currentStep === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl mx-auto"
              >
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Cart Items */}
                  <div className="lg:col-span-2 space-y-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6">Your Cart</h1>

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

                    {/* Voucher Input */}
                    <div className="pt-6 border-t border-gray-800">
                      <h3 className="text-lg font-semibold text-white mb-4">Discount Code</h3>
                      <VoucherInput onApply={applyVoucher} />
                    </div>
                  </div>

                  {/* Order Summary Sidebar */}
                  <div className="lg:col-span-1">
                    <div className="bg-black rounded-2xl p-6 sticky top-24">
                      <h2 className="text-xl font-bold text-white mb-6">Summary</h2>

                      <CartSummary
                        summary={orderSummary}
                        showTax={false}
                        showDiscount={true}
                        voucherCode={cart.voucherCode}
                        onRemoveVoucher={removeVoucher}
                      />

                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleContinueFromReview}
                        className="w-full mt-6 bg-brand-primary text-black hover:bg-brand-dark font-bold cursor-pointer"
                      >
                        Continue
                      </Button>

                      <Link href="/#tickets">
                        <button className="w-full mt-4 text-center text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">
                          Continue Shopping
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Workshop Upsells */}
            {currentStep === 'upsells' && showWorkshopUpsells && (
              <motion.div
                key="upsells"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="max-w-3xl mx-auto"
              >
                {/* Header */}
                <div className="text-center mb-12">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4">
                    Add Workshop Credit
                  </h1>
                  <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-6">
                    Get <span className="text-brand-primary font-bold">{bonusPercent}% bonus credit</span> on workshop vouchers during this pricing stage.
                  </p>

                  {/* Info */}
                  <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-xl p-4 sm:p-6">
                    <p className="text-sm sm:text-base text-gray-200">
                      <span className="font-semibold text-brand-primary">Flexible Use:</span> Valid for both conference workshops and ZurichJS meetup workshops.
                    </p>
                  </div>
                </div>

                {/* Voucher Cards */}
                <div className="space-y-3 sm:space-y-4 mb-12">
                  {workshopVoucherAmounts.map((amount) => (
                    <WorkshopVoucherCard
                      key={amount}
                      amount={amount}
                      bonusPercent={bonusPercent}
                      currency={cart.currency || 'CHF'}
                      onClick={() => handleAddWorkshopVoucher(amount)}
                    />
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col items-center gap-4">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => setCurrentStep('checkout')}
                    className="bg-brand-primary text-black hover:bg-brand-dark font-bold cursor-pointer w-full sm:w-auto sm:px-16"
                  >
                    Continue to Checkout
                  </Button>
                  <button
                    onClick={() => setCurrentStep('checkout')}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer text-sm"
                  >
                    Skip workshop credit
                  </button>
                  <button
                    onClick={() => setCurrentStep('review')}
                    className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer text-sm inline-flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to cart
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Checkout */}
            {currentStep === 'checkout' && (
              <motion.div
                key="checkout"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="max-w-7xl mx-auto">
                  <div className="grid lg:grid-cols-3 gap-8">
                    {/* Checkout Form */}
                    <div className="lg:col-span-2">
                      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6">Checkout</h1>
                      {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                          <p className="text-red-400 text-sm">{error.message}</p>
                        </div>
                      )}
                      <CheckoutForm
                        onSubmit={handleCheckoutSubmit}
                        isSubmitting={isSubmitting}
                        totalAmount={orderSummary.total.toFixed(2)}
                        currency={orderSummary.currency}
                        onBack={() => setCurrentStep(showWorkshopUpsells ? 'upsells' : 'review')}
                      />
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                      <div className="sticky top-24 space-y-6">
                        <div className="bg-black rounded-2xl p-6">
                          <h2 className="text-lg font-bold text-white mb-4">Order Summary</h2>
                          <div className="space-y-3 mb-6">
                            {cart.items.map((item) => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <div>
                                  <div className="text-white font-medium">{item.title}</div>
                                  <div className="text-gray-400">Qty: {item.quantity}</div>
                                </div>
                                <div className="text-white font-semibold">
                                  {(item.price * item.quantity).toFixed(2)} {item.currency}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="border-t border-gray-800 pt-4">
                            <CartSummary
                              summary={orderSummary}
                              showTax={false}
                              showDiscount={true}
                              voucherCode={cart.voucherCode}
                              onRemoveVoucher={removeVoucher}
                            />
                          </div>
                        </div>

                        {/* Trust Badges */}
                        <div className="bg-black rounded-2xl p-6">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm text-gray-400">
                              <svg className="w-5 h-5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span>Secure payment via Stripe</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-400">
                              <svg className="w-5 h-5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span>Flexible refund policy</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} />
      </div>
    </>
  );
}
