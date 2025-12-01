/**
 * Ticket Order Page
 * Simplified multi-step ticket ordering flow with TanStack Query integration
 * Server-side prefetches pricing data to prevent UI shifts
 * REQUIRES AUTHENTICATION: Users must be logged in to access the cart
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
import { useTicketPricing } from '@/hooks/useTicketPricing';
import { useWorkshopVouchers } from '@/hooks/useWorkshopVouchers';
import { useCheckout } from '@/hooks/useCheckout';
import { useToast } from '@/hooks/useToast';
import { useCartUrlSync } from '@/hooks/useCartUrlState';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';
import { CartItem, CartSummary, VoucherInput, WorkshopVoucherCard, ToastContainer, TeamRequestModal, TeamRequestSuccessDialog, AttendeeForm, type TeamRequestData } from '@/components/molecules';
import {Button, Heading} from '@/components/atoms';
import {PageHeader, CheckoutForm, SectionContainer} from '@/components/organisms';
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
import { TicketXIcon } from "lucide-react";

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
    analytics.track('button_clicked', {
      button_text: 'Cart loaded from URL',
      button_location: 'cart_page',
      button_action: 'load_cart_from_url',
      button_context: { itemCount: urlCart.items.length },
    } as EventProperties<'button_clicked'>);
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

  // Team request success dialog
  const [showTeamSuccessDialog, setShowTeamSuccessDialog] = useState(false);
  const [successTeamData, setSuccessTeamData] = useState<TeamRequestData | null>(null);

  // TODO: we should actually scan across all tickets. team discounts should work even if you have 2 VIP and 2 standard.
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
        analytics.error('Team request API error', new Error(errorMessage), {
          type: 'network',
          severity: 'medium',
          code: response.status.toString(),
        });
        throw new Error(errorMessage);
      }

      // Track successful team request
      analytics.track('form_submitted', {
        form_name: 'team_request',
        form_type: 'other',
        form_success: true,
      } as EventProperties<'form_submitted'>);

      // Don't show toast anymore - we'll show the success dialog instead
    } catch (error) {
      analytics.error('Team request error', error instanceof Error ? error : new Error('Unknown error'), {
        type: 'network',
        severity: 'medium',
      });
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit request';
      showToast(errorMessage, 'error');
      throw error;
    }
  };

  const handleTeamRequestSuccess = (data: TeamRequestData) => {
    setSuccessTeamData(data);
    setShowTeamModal(false);
    setShowTeamSuccessDialog(true);
  };

  const closeTeamSuccessDialog = () => {
    setShowTeamSuccessDialog(false);
    setSuccessTeamData(null);
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
    // CRITICAL: Identify user before tracking checkout
    // This links anonymous browsing behavior to this user's email
    analytics.identify(data.email, {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      name: `${data.firstName} ${data.lastName}`.trim(),
      company: data.company || undefined,
      job_title: data.jobTitle || undefined,
    });

    // Track checkout started
    analytics.track('checkout_started', {
      cart_item_count: cart.items.length,
      cart_total_amount: orderSummary.total,
      cart_currency: orderSummary.currency,
      cart_items: cart.items.map(item => ({
        type: item.title.includes('Workshop') ? 'workshop_voucher' as const : 'ticket' as const,
        category: item.variant === 'member' ? 'standard' : item.variant,
        stage: 'general_admission',
        quantity: item.quantity,
        price: item.price,
      })),
      email: data.email,
      company: data.company,
    } as EventProperties<'checkout_started'>);

    createCheckout({
      cart,
      customerInfo: {
        ...data,
        attendees, // Include attendee information for multi-ticket orders
      },
    });
  };

  const handleContinueFromReview = () => {
    // Track cart review completion
    analytics.track('cart_reviewed', {
      cart_item_count: cart.items.length,
      cart_total_amount: orderSummary.total,
      cart_currency: orderSummary.currency,
      cart_items: cart.items.map(item => ({
        type: item.title.includes('Workshop') ? 'workshop_voucher' as const : 'ticket' as const,
        category: item.variant === 'member' ? 'standard' : item.variant,
        stage: 'general_admission',
        quantity: item.quantity,
        price: item.price,
      })),
    } as EventProperties<'cart_reviewed'>);

    if (needsAttendeeInfo) {
      setCurrentStep('attendees');
    } else if (showWorkshopUpsells) {
      setCurrentStep('upsells');
    } else {
      setCurrentStep('checkout');
    }
  };

  // Track step views
  useEffect(() => {
    analytics.track('cart_step_viewed', {
      step: currentStep,
      cart_item_count: cart.items.length,
      cart_total_amount: orderSummary.total,
    } as EventProperties<'cart_step_viewed'>);

    // Track workshop upsell view
    if (currentStep === 'upsells' && showWorkshopUpsells) {
      analytics.track('workshop_upsell_viewed', {
        bonus_percent: bonusPercent,
        available_vouchers: workshopVouchers.length,
        current_stage: currentStage || 'unknown',
      } as EventProperties<'workshop_upsell_viewed'>);
    }
  }, [currentStep, cart.items.length, orderSummary.total, showWorkshopUpsells, bonusPercent, workshopVouchers.length, currentStage]);

  // Empty order state
  if (isEmpty) {
    return (
      <>
        <Head>
          <title>No Tickets Selected | ZurichJS Conference 2026</title>
        </Head>

        <PageHeader />

        <div className="min-h-screen bg-brand-gray-darkest flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="w-full flex justify-center">
              <TicketXIcon size={48} className="stroke-brand-red" />
            </div>
            <h1 className="text-3xl font-bold text-brand-white mb-3">No Tickets Selected</h1>
            <p className="text-brand-gray-light mb-8">
              Choose your tickets to get started with your conference registration.
            </p>
            <Link href="/#tickets">
              <Button
                variant="primary"
                asChild
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

      <div className="min-h-screen bg-brand-black">
        {/* Header with ticket count */}
        <PageHeader
          rightContent={
            <span className="text-sm text-brand-gray-light">
              {ticketCount} ticket{ticketCount !== 1 ? 's' : ''}
            </span>
          }
        />

        {/* Progress Steps */}
        <div className="bg-brand-darkest">
          <SectionContainer>
            {isPricingLoading ? (
              // Loading skeleton to prevent layout shift
              <div className="flex items-center justify-center gap-2 sm:gap-4 max-w-2xl mx-auto animate-pulse">
                {Array(3).fill(null).map((_, index) => (
                    <div key={index} className="flex items-center">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-gray-dark" />
                        <div className="ml-2 sm:ml-3 w-16 h-4 bg-brand-gray-dark rounded" />
                    </div>
                ))}
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
                    currentStep === 'review' ? 'bg-brand-primary text-black' : 'bg-brand-gray-dark text-brand-gray-light'
                  }`}>
                    1
                  </div>
                  <span className={`ml-1 sm:ml-2 md:ml-3 text-[10px] sm:text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                    currentStep === 'review' ? 'text-brand-white' : 'text-brand-gray-light'
                  }`}>
                    Tickets
                  </span>
                </button>

                {/* Connector */}
                <div className="w-3 sm:w-6 md:w-10 lg:w-14 h-0.5 bg-brand-gray-dark shrink-0"></div>

                {/* Step 2 - Attendees (conditional) */}
                {needsAttendeeInfo && (
                  <>
                    <button
                      onClick={() => setCurrentStep('attendees')}
                      className="flex items-center cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                      aria-label="Go to Attendees step"
                    >
                      <div className={`w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm md:text-base font-bold transition-colors ${
                        currentStep === 'attendees' ? 'bg-brand-primary text-black' : 'bg-brand-gray-dark text-brand-gray-light'
                      }`}>
                        2
                      </div>
                      <span className={`ml-1 sm:ml-2 md:ml-3 text-[10px] sm:text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                        currentStep === 'attendees' ? 'text-brand-white' : 'text-brand-gray-light'
                      }`}>
                        Attendees
                      </span>
                    </button>

                    <div className="w-3 sm:w-6 md:w-10 lg:w-14 h-0.5 bg-brand-gray-dark shrink-0"></div>
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
                        currentStep === 'upsells' ? 'bg-brand-primary text-black' : 'bg-brand-gray-dark text-brand-gray-light'
                      }`}>
                        {needsAttendeeInfo ? '3' : '2'}
                      </div>
                      <span className={`ml-1 sm:ml-2 md:ml-3 text-[10px] sm:text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                        currentStep === 'upsells' ? 'text-brand-white' : 'text-brand-gray-light'
                      }`}>
                        Workshops
                      </span>
                    </button>

                    <div className="w-3 sm:w-6 md:w-10 lg:w-14 h-0.5 bg-brand-gray-dark shrink-0"></div>
                  </>
                )}

                {/* Step 4 - Payment */}
                <button
                  onClick={() => setCurrentStep('checkout')}
                  className="flex items-center cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                  aria-label="Go to Payment step"
                >
                  <div className={`w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm md:text-base font-bold transition-colors ${
                    currentStep === 'checkout' ? 'bg-brand-primary text-black' : 'bg-brand-gray-dark text-brand-gray-light'
                  }`}>
                    {needsAttendeeInfo && showWorkshopUpsells ? '4' : needsAttendeeInfo || showWorkshopUpsells ? '3' : '2'}
                  </div>
                  <span className={`ml-1 sm:ml-2 md:ml-3 text-[10px] sm:text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                    currentStep === 'checkout' ? 'text-brand-white' : 'text-brand-gray-light'
                  }`}>
                    Payment
                  </span>
                </button>
              </div>
            )}
          </SectionContainer>
        </div>

        {/* Main Content */}
        <SectionContainer className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <AnimatePresence mode="wait">
            {/* Step 1: Review Cart */}
            {currentStep === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col lg:flex-row gap-8 justify-center"
              >
                {/* Ticket Items */}
                <div className="flex-[2_0_0] flex flex-col gap-5 max-w-screen-lg">
                  <Heading level="h1" className="text-xl font-bold text-brand-white">Your tickets</Heading>

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
                      className=""
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <h3 className="text-md font-bold text-brand-white mb-1">
                            Coming as a group?
                          </h3>
                          <p className="text-sm text-brand-gray-light mb-4">
                            We offer <strong className="text-brand-yellow-main drop-shadow-md drop-shadow-brand-yellow-main/30">custom team pricing (from Early Bird onwards)</strong> and simplified invoicing for groups of 3+. Let us create a package tailored for your team!
                          </p>
                          <Button
                            variant="primary"
                            onClick={handleTeamModalOpen}
                            size="sm"
                          >
                            Request Team Quote
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Discount Code Input */}
                  <div className="">
                    <h3 className="text-lg font-semibold text-brand-white mb-4">Promo Code</h3>
                    <VoucherInput onApply={applyVoucher} />
                  </div>
                </div>

                {/* Order Summary Sidebar */}
                <div className="flex-[1_0_0] lg:max-w-screen-xs sticky top-24 flex flex-col gap-5">
                    <Heading level="h2" className="text-lg mt-1.5 font-bold text-brand-white">Order summary</Heading>

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
                      variant="accent"
                      onClick={handleContinueFromReview}
                      className="w-full"
                    >
                      Continue
                    </Button>

                    <Link href="/#tickets">
                      <Button className="w-full" asChild variant="ghost">
                        Add more tickets
                      </Button>
                    </Link>
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
              >
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
              <SectionContainer>
                <motion.div
                  key="upsells"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-5"
                >
                  <Heading level="h1" className="text-xl font-bold text-brand-white">
                    Add workshop credit
                  </Heading>

                  <p className="leading-relaxed">
                    Get <span className="text-brand-primary font-bold">{bonusPercent}% bonus credit</span> on workshop vouchers during this pricing stage.
                    Valid for both conference workshops and ZurichJS meetup workshops.
                  </p>

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
                    className="w-full sm:w-auto sm:px-16"
                  >
                    Continue to Payment
                  </Button>
                  <button
                    onClick={() => {
                      // Track workshop upsell skip
                      analytics.track('workshop_upsell_skipped', {
                        bonus_percent: bonusPercent,
                      } as EventProperties<'workshop_upsell_skipped'>);
                      setCurrentStep('checkout');
                    }}
                    className="text-brand-gray-light hover:text-brand-white transition-colors cursor-pointer text-sm"
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
              </SectionContainer>
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
                      <h1 className="text-xl font-bold text-brand-white mb-6">Complete Registration</h1>
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
                          <h2 className="text-lg font-bold text-brand-white mb-4">Order Summary</h2>
                          <div className="space-y-3 mb-6">
                            {cart.items.map((item) => (
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
                                    onClick={() => removeFromCart(item.id)}
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
                            onRemoveVoucher={removeVoucher}
                          />
                        </div>

                        {/* Trust Badges */}
                        <div className="flex items-center gap-3 text-sm text-brand-gray-light">
                          <svg className="w-5 h-5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Secure payment via Stripe</span>
                        </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SectionContainer>

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
            onSuccess={handleTeamRequestSuccess}
          />
        )}

        {/* Team Request Success Dialog */}
        <TeamRequestSuccessDialog
          isOpen={showTeamSuccessDialog}
          onClose={closeTeamSuccessDialog}
          email={successTeamData?.email || null}
          company={successTeamData?.company || null}
          quantity={successTeamData?.quantity || null}
        />
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
