/**
 * Ticket Order Page
 * Simplified multi-step ticket ordering flow with TanStack Query integration
 * Server-side prefetches pricing data to prevent UI shifts
 * REQUIRES AUTHENTICATION: Users must be logged in to access the cart
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
import { useTicketPricing } from '@/hooks/useTicketPricing';
import { useWorkshopVouchers } from '@/hooks/useWorkshopVouchers';
import { useCheckout } from '@/hooks/useCheckout';
import { useToast } from '@/hooks/useToast';
import { useCartUrlSync } from '@/hooks/useCartUrlState';
import { CartItem, CartSummary, VoucherInput, WorkshopVoucherCard, ToastContainer, TeamRequestModal, AttendeeForm, type TeamRequestData } from '@/components/molecules';
import { Button } from '@/components/atoms';
import { PageHeader, CheckoutForm } from '@/components/organisms';
import { calculateOrderSummary } from '@/lib/cart';
import type { CheckoutFormData, Cart as CartType } from '@/types/cart';
import type { AttendeeInfo } from '@/lib/validations/checkout';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { dehydrate } from '@tanstack/react-query';
import { ticketPricingQueryOptions } from '@/lib/queries/tickets';
import { workshopVouchersQueryOptions } from '@/lib/queries/workshops';
import { createQueryClient } from '@/lib/query-client';

type CartStep = 'review' | 'attendees' | 'upsells' | 'checkout';

export default function CartPage() {
  const {
    cart,
    updateItemQuantity,
    removeFromCart,
    applyVoucher,
    removeVoucher,
    addToCart,
  } = useCart();

  // Pricing data is prefetched on server, so isLoading should be false immediately
  const { currentStage, isLoading: isPricingLoading } = useTicketPricing();
  const { vouchers: workshopVouchers, isLoading: isVouchersLoading } = useWorkshopVouchers();
  const [currentStep, setCurrentStep] = useState<CartStep>('review');
  const [attendees, setAttendees] = useState<AttendeeInfo[]>([]);
  const { mutate: createCheckout, isPending: isSubmitting, error } = useCheckout();
  const { toasts, showToast } = useToast();

  // Sync cart with URL state (cart page only)
  // This allows sharing cart URLs while keeping other pages clean
  const handleCartLoad = useCallback((urlCart: CartType) => {
    // When loading from URL, replace the entire cart
    // Note: This would need to be implemented in CartContext
    // For now, we'll just let the URL sync work one-way (context -> URL)
    console.log('Cart loaded from URL:', urlCart);
  }, []);

  useCartUrlSync(cart, handleCartLoad);

  const orderSummary = calculateOrderSummary(cart);
  const isEmpty = cart.items.length === 0;

  // Workshop upsell logic
  // Prevent layout shift by determining this once pricing data and vouchers are loaded
  const showWorkshopUpsells = !isPricingLoading && !isVouchersLoading && workshopVouchers.length > 0 && (currentStage === 'blind_bird' || currentStage === 'early_bird');
  const bonusPercent = currentStage === 'blind_bird' ? 25 : currentStage === 'early_bird' ? 15 : 0;

  // Team package upsell logic
  // Detect if user has 3+ of the same ticket type
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamTicketInfo, setTeamTicketInfo] = useState<{ type: string; quantity: number } | null>(null);

  const eligibleTeamTicket = cart.items.find(item => item.quantity >= 3);
  const showTeamUpsell = eligibleTeamTicket && !cart.couponCode; // Don't show if already using a coupon

  const handleTeamModalOpen = () => {
    if (eligibleTeamTicket) {
      setTeamTicketInfo({
        type: eligibleTeamTicket.title,
        quantity: eligibleTeamTicket.quantity,
      });
      setShowTeamModal(true);
    }
  };

  const handleTeamRequestSubmit = async (data: TeamRequestData) => {
    try {
      const response = await fetch('/api/team-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.error || 'Failed to submit team request';
        console.error('Team request API error:', errorMessage, result);
        throw new Error(errorMessage);
      }

      showToast('Team request submitted! We\'ll be in touch soon.', 'success');
    } catch (error) {
      console.error('Team request error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit request';
      showToast(errorMessage, 'error');
      throw error;
    }
  };

  const handleAddWorkshopVoucher = (voucherId: string) => {
    const voucher = workshopVouchers.find(v => v.id === voucherId);
    if (!voucher) return;

    // Amount is in cents, convert to display currency
    const amount = voucher.amount / 100;
    const bonusAmount = (amount * bonusPercent) / 100;
    const totalValue = amount + bonusAmount;

    addToCart({
      id: voucher.id,
      title: `Workshop Voucher (+${bonusPercent}% bonus)`,
      price: voucher.amount / 100, // Convert from cents to regular currency
      currency: voucher.currency,
      priceId: voucher.priceId, // Use real Stripe price ID
      variant: 'standard',
    }, 1);

    showToast(`Added ${totalValue} ${voucher.currency} workshop credit to your order!`, 'success');
  };

  // Check if we need attendee collection (more than 1 ticket total)
  // Exclude workshop vouchers - they don't require separate attendee info
  const ticketItems = cart.items.filter(item => !item.title.includes('Workshop Voucher'));
  const ticketCount = ticketItems.reduce((sum, item) => sum + item.quantity, 0);
  const needsAttendeeInfo = ticketCount > 1;

  const handleAttendeesSubmit = (attendeeData: AttendeeInfo[]) => {
    setAttendees(attendeeData);
    // After collecting attendees, go to upsells or checkout
    if (showWorkshopUpsells) {
      setCurrentStep('upsells');
    } else {
      setCurrentStep('checkout');
    }
  };

  const handleCheckoutSubmit = (data: CheckoutFormData) => {
    console.log('[Cart] Submitting checkout with cart:', {
      couponCode: cart.couponCode,
      discountAmount: cart.discountAmount,
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
    });

    createCheckout({
      cart,
      customerInfo: {
        ...data,
        attendees, // Include attendee information for multi-ticket orders
      },
    });
  };

  const handleContinueFromReview = () => {
    if (needsAttendeeInfo) {
      setCurrentStep('attendees');
    } else if (showWorkshopUpsells) {
      setCurrentStep('upsells');
    } else {
      setCurrentStep('checkout');
    }
  };

  // Empty order state
  if (isEmpty) {
    return (
      <>
        <Head>
          <title>No Tickets Selected | ZurichJS Conference 2026</title>
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
                <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">No Tickets Selected</h1>
            <p className="text-gray-400 mb-8">
              Choose your tickets to get started with your conference registration.
            </p>
            <Link href="/#tickets">
              <Button
                variant="primary"
                size="lg"
                className="bg-brand-primary text-black hover:bg-brand-dark cursor-pointer"
              >
                View Tickets
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
        <title>Your Tickets | ZurichJS Conference 2026</title>
      </Head>

      <div className="min-h-screen bg-surface-section">
        {/* Header with ticket count */}
        <PageHeader
          rightContent={
            <span className="text-sm text-gray-400">
              {ticketCount} ticket{ticketCount !== 1 ? 's' : ''}
            </span>
          }
        />

        {/* Progress Steps */}
        <div className="bg-black/50 border-b border-gray-800">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {isPricingLoading ? (
              // Loading skeleton to prevent layout shift
              <div className="flex items-center justify-center gap-2 sm:gap-4 max-w-2xl mx-auto animate-pulse">
                <div className="flex items-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-800" />
                  <div className="ml-2 sm:ml-3 w-12 h-4 bg-gray-800 rounded" />
                </div>
                <div className="w-8 sm:w-16 h-0.5 bg-gray-800" />
                <div className="flex items-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-800" />
                  <div className="ml-2 sm:ml-3 w-16 h-4 bg-gray-800 rounded" />
                </div>
                <div className="w-8 sm:w-16 h-0.5 bg-gray-800" />
                <div className="flex items-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-800" />
                  <div className="ml-2 sm:ml-3 w-14 h-4 bg-gray-800 rounded" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1 sm:gap-2 md:gap-3 max-w-2xl mx-auto">
                {/* Step 1 */}
                <button
                  onClick={() => setCurrentStep('review')}
                  className="flex items-center cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                  aria-label="Go to Review Tickets step"
                >
                  <div className={`w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm md:text-base font-bold transition-colors ${
                    currentStep === 'review' ? 'bg-brand-primary text-black' : 'bg-gray-800 text-gray-400'
                  }`}>
                    1
                  </div>
                  <span className={`ml-1 sm:ml-2 md:ml-3 text-[10px] sm:text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                    currentStep === 'review' ? 'text-white' : 'text-gray-400'
                  }`}>
                    Tickets
                  </span>
                </button>

                {/* Connector */}
                <div className="w-3 sm:w-6 md:w-10 lg:w-14 h-0.5 bg-gray-800 shrink-0"></div>

                {/* Step 2 - Attendees (conditional) */}
                {needsAttendeeInfo && (
                  <>
                    <button
                      onClick={() => setCurrentStep('attendees')}
                      className="flex items-center cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                      aria-label="Go to Attendees step"
                    >
                      <div className={`w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm md:text-base font-bold transition-colors ${
                        currentStep === 'attendees' ? 'bg-brand-primary text-black' : 'bg-gray-800 text-gray-400'
                      }`}>
                        2
                      </div>
                      <span className={`ml-1 sm:ml-2 md:ml-3 text-[10px] sm:text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                        currentStep === 'attendees' ? 'text-white' : 'text-gray-400'
                      }`}>
                        Attendees
                      </span>
                    </button>

                    <div className="w-3 sm:w-6 md:w-10 lg:w-14 h-0.5 bg-gray-800 shrink-0"></div>
                  </>
                )}

                {/* Step 3 - Workshops (conditional) */}
                {showWorkshopUpsells && (
                  <>
                    <button
                      onClick={() => setCurrentStep('upsells')}
                      className="flex items-center cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                      aria-label="Go to Workshop Upsells step"
                    >
                      <div className={`w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm md:text-base font-bold transition-colors ${
                        currentStep === 'upsells' ? 'bg-brand-primary text-black' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {needsAttendeeInfo ? '3' : '2'}
                      </div>
                      <span className={`ml-1 sm:ml-2 md:ml-3 text-[10px] sm:text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                        currentStep === 'upsells' ? 'text-white' : 'text-gray-400'
                      }`}>
                        Workshops
                      </span>
                    </button>

                    <div className="w-3 sm:w-6 md:w-10 lg:w-14 h-0.5 bg-gray-800 shrink-0"></div>
                  </>
                )}

                {/* Step 4 - Payment */}
                <button
                  onClick={() => setCurrentStep('checkout')}
                  className="flex items-center cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                  aria-label="Go to Payment step"
                >
                  <div className={`w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm md:text-base font-bold transition-colors ${
                    currentStep === 'checkout' ? 'bg-brand-primary text-black' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {needsAttendeeInfo && showWorkshopUpsells ? '4' : needsAttendeeInfo || showWorkshopUpsells ? '3' : '2'}
                  </div>
                  <span className={`ml-1 sm:ml-2 md:ml-3 text-[10px] sm:text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                    currentStep === 'checkout' ? 'text-white' : 'text-gray-400'
                  }`}>
                    Payment
                  </span>
                </button>
              </div>
            )}
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
                  {/* Ticket Items */}
                  <div className="lg:col-span-2 space-y-6">
                    <h1 className="text-xl font-bold text-white mb-6">Your Tickets</h1>

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

                    {/* Team Package Upsell Banner */}
                    {showTeamUpsell && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-brand-primary/10 to-brand-primary/5 border border-brand-primary/30 rounded-xl p-6"
                      >
                        <div className="flex items-start gap-4">
                          <div className="shrink-0 w-12 h-12 bg-brand-primary/20 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-1">
                              Coming as a group?
                            </h3>
                            <p className="text-sm text-gray-300 mb-4">
                              We offer <strong className="text-brand-primary">custom team pricing</strong> and simplified invoicing for groups of 3+. Let us create a package tailored for your team!
                            </p>
                            <div className="flex flex-wrap gap-3">
                              <button
                                onClick={handleTeamModalOpen}
                                className="px-6 py-2.5 bg-brand-primary text-black font-semibold rounded-lg hover:bg-brand-dark transition-colors cursor-pointer"
                              >
                                Request Team Quote
                              </button>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Single invoice • Bank transfer available</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Discount Code Input */}
                    <div className="pt-6 border-t border-gray-800">
                      <h3 className="text-lg font-semibold text-white mb-4">Promo Code</h3>
                      <VoucherInput onApply={applyVoucher} />
                    </div>
                  </div>

                  {/* Order Summary Sidebar */}
                  <div className="lg:col-span-1">
                    <div className="bg-black rounded-2xl p-6 sticky top-24">
                      <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>

                      <CartSummary
                        summary={orderSummary}
                        showTax={false}
                        showDiscount={true}
                        voucherCode={cart.couponCode}
                        discountType={cart.discountType}
                        discountValue={cart.discountValue}
                        onRemoveVoucher={removeVoucher}
                      />

                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleContinueFromReview}
                        className="w-full mt-6 bg-brand-primary text-black hover:bg-brand-dark font-bold cursor-pointer"
                      >
                        Continue to Payment
                      </Button>

                      <Link href="/#tickets">
                        <button className="w-full mt-4 text-center text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">
                          Add More Tickets
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Attendees (conditional) */}
            {currentStep === 'attendees' && needsAttendeeInfo && (
              <motion.div
                key="attendees"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl mx-auto"
              >
                <h1 className="text-xl font-bold text-white mb-6">Attendee Information</h1>
                <AttendeeForm
                  cartItems={ticketItems}
                  initialAttendees={attendees}
                  onSubmit={handleAttendeesSubmit}
                  onBack={() => setCurrentStep('review')}
                />
              </motion.div>
            )}

            {/* Step 3: Workshop Upsells */}
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
                  {workshopVouchers.map((voucher) => (
                    <WorkshopVoucherCard
                      key={voucher.id}
                      amount={voucher.amount / 100}
                      bonusPercent={bonusPercent}
                      currency={voucher.currency}
                      onClick={() => handleAddWorkshopVoucher(voucher.id)}
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
                    Continue to Payment
                  </Button>
                  <button
                    onClick={() => setCurrentStep('checkout')}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer text-sm"
                  >
                    Skip workshop credit
                  </button>
                  <button
                    onClick={() => setCurrentStep(needsAttendeeInfo ? 'attendees' : 'review')}
                    className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer text-sm inline-flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to {needsAttendeeInfo ? 'attendees' : 'tickets'}
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
                    {/* Payment Form */}
                    <div className="lg:col-span-2">
                      <h1 className="text-xl font-bold text-white mb-6">Complete Registration</h1>
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
                        onBack={() => {
                          if (showWorkshopUpsells) {
                            setCurrentStep('upsells');
                          } else if (needsAttendeeInfo) {
                            setCurrentStep('attendees');
                          } else {
                            setCurrentStep('review');
                          }
                        }}
                        defaultValues={attendees.length > 0 ? {
                          // Pre-fill with primary attendee (first attendee)
                          firstName: attendees[0].firstName,
                          lastName: attendees[0].lastName,
                          email: attendees[0].email,
                          company: attendees[0].company || '',
                          jobTitle: attendees[0].jobTitle || '',
                        } : undefined}
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
                              voucherCode={cart.couponCode}
                              discountType={cart.discountType}
                              discountValue={cart.discountValue}
                              onRemoveVoucher={removeVoucher}
                            />
                          </div>
                        </div>

                        {/* Trust Badges */}
                        <div className="bg-black rounded-2xl p-6">
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <svg className="w-5 h-5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>Secure payment via Stripe</span>
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

        {/* Team Request Modal */}
        {teamTicketInfo && (
          <TeamRequestModal
            isOpen={showTeamModal}
            onClose={() => setShowTeamModal(false)}
            ticketType={teamTicketInfo.type}
            quantity={teamTicketInfo.quantity}
            onSubmit={handleTeamRequestSubmit}
          />
        )}
      </div>
    </>
  );
}

/**
 * Server-side props - Prefetch pricing data and workshop vouchers
 * This eliminates the loading state and prevents UI shifts
 * The dehydrated state is automatically picked up by HydrationBoundary in _app.tsx
 */
export const getServerSideProps: GetServerSideProps = async () => {
  const queryClient = createQueryClient();

  try {
    // Prefetch both ticket pricing and workshop vouchers in parallel
    await Promise.all([
      queryClient.prefetchQuery(ticketPricingQueryOptions),
      queryClient.prefetchQuery(workshopVouchersQueryOptions),
    ]);
  } catch (error) {
    // If prefetch fails, log it but don't block page render
    console.error('Failed to prefetch data:', error);
  }

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  };
};
