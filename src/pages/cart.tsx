/**
 * Ticket Order Page
 * Simplified multi-step ticket ordering flow with TanStack Query integration
 * Server-side prefetches pricing data to prevent UI shifts
 * REQUIRES AUTHENTICATION: Users must be logged in to access the cart
 */

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { AnimatePresence } from 'framer-motion';
import { dehydrate } from '@tanstack/react-query';
import type { GetServerSideProps } from 'next';

import { useCart } from '@/contexts/CartContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTicketPricing } from '@/hooks/useTicketPricing';
import { useWorkshopVouchers } from '@/hooks/useWorkshopVouchers';
import { useCheckout } from '@/hooks/useCheckout';
import { useToast } from '@/hooks/useToast';
import { useCartUrlSync } from '@/hooks/useCartUrlState';
import { useTeamRequest } from '@/hooks/useTeamRequest';
import { useCartAbandonment } from '@/hooks/useCartAbandonment';
import { useCartAbandonmentEmail } from '@/hooks/useCartAbandonmentEmail';

import { encodeCartState } from '@/lib/cart-url-state';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';
import { mapCartItemsToAnalytics } from '@/lib/analytics/helpers';
import { calculateOrderSummary } from '@/lib/cart';
import { createTicketPricingQueryOptions } from '@/lib/queries/tickets';
import { workshopVouchersQueryOptions } from '@/lib/queries/workshops';
import { createQueryClient } from '@/lib/query-client';
import { decodeCartState, createEmptyCart } from '@/lib/cart-url-state';
import { detectCountryFromRequest } from '@/lib/geo/detect-country';
import { getCurrencyFromCountry } from '@/config/currency';

import { ToastContainer, TeamRequestModal, TeamRequestSuccessDialog, AttendeeForm } from '@/components/molecules';
import { PageHeader, SectionContainer } from '@/components/organisms';
import {
  EmptyCartState,
  CartProgressSteps,
  ReviewStep,
  UpsellsStep,
  CheckoutStep,
  type CartStep,
  type CheckoutFormData,
  type AttendeeInfo,
} from '@/components/cart';

export default function CartPage() {
  const {
    cart,
    updateItemQuantity,
    removeFromCart,
    applyVoucher,
    removeVoucher,
    addToCart,
  } = useCart();

  const { currency } = useCurrency();
  const { plans: ticketPlans, currentStage, isLoading: isPricingLoading } = useTicketPricing();
  const { vouchers: workshopVouchers, isLoading: isVouchersLoading } = useWorkshopVouchers();
  const [currentStep, setCurrentStep] = useState<CartStep>('review');
  const [attendees, setAttendees] = useState<AttendeeInfo[]>([]);
  const [capturedEmail, setCapturedEmail] = useState<string | null>(null);
  const { mutate: createCheckout, isPending: isSubmitting, error } = useCheckout();
  const { mutate: scheduleAbandonmentEmail } = useCartAbandonmentEmail();
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);
  const { toasts, showToast } = useToast();
  const router = useRouter();
  const hasTrackedRecovery = useRef(false);

  useCartUrlSync(cart);

  const orderSummary = calculateOrderSummary(cart);
  const isEmpty = cart.items.length === 0;
  const isPartialDiscount = cart.applicablePriceIds !== undefined &&
    cart.applicablePriceIds.length > 0 &&
    cart.applicablePriceIds.length < cart.items.length;

  // Workshop upsell logic (CHF only during early pricing stages)
  const showWorkshopUpsells = currency === 'CHF' && !isPricingLoading && !isVouchersLoading && workshopVouchers.length > 0 && (currentStage === 'blind_bird' || currentStage === 'early_bird');
  const bonusPercent = currentStage === 'blind_bird' ? 25 : currentStage === 'early_bird' ? 15 : 0;

  // Filter out workshop vouchers for ticket counting
  const ticketItems = cart.items.filter(item => !item.title.includes('Workshop Voucher'));
  const ticketCount = ticketItems.reduce((sum, item) => sum + item.quantity, 0);
  const needsAttendeeInfo = ticketCount > 1;

  // VIP upsell logic
  const standardTicketItem = cart.items.find(item => item.variant === 'standard' && !item.title.includes('Workshop'));
  const showVipUpsell = ticketCount >= 1 && ticketCount <= 2 && !!standardTicketItem;

  // Team upsell logic
  const showTeamUpsell = ticketCount >= 3 && !cart.couponCode;

  // Team request hook
  const {
    isModalOpen: showTeamModal,
    ticketInfo: teamTicketInfo,
    isSuccessDialogOpen: showTeamSuccessDialog,
    successData: successTeamData,
    openModal: openTeamModal,
    closeModal: closeTeamModal,
    submitRequest: handleTeamRequestSubmit,
    handleSuccess: handleTeamRequestSuccess,
    closeSuccessDialog: closeTeamSuccessDialog,
  } = useTeamRequest({
    onError: (message) => showToast(message, 'error'),
  });

  const handleTeamModalOpen = () => {
    if (ticketCount >= 3) {
      const ticketSummary = ticketItems.map(t => t.title).join(', ');
      openTeamModal(ticketSummary, ticketCount);
    }
  };

  const handleAddWorkshopVoucher = (voucherId: string) => {
    const voucher = workshopVouchers.find(v => v.id === voucherId);
    if (!voucher) return;

    const amount = voucher.amount / 100;
    const bonusAmount = (amount * bonusPercent) / 100;
    const totalValue = amount + bonusAmount;

    addToCart({
      id: voucher.id,
      title: `Workshop Voucher (+${bonusPercent}% bonus)`,
      price: voucher.amount / 100,
      currency: voucher.currency,
      priceId: voucher.priceId,
      variant: 'standard',
    }, 1);

    showToast(`Added ${totalValue} ${voucher.currency} workshop credit to your order!`, 'success');
  };

  const handleUpgradeToVip = () => {
    if (!standardTicketItem) return;
    const vipPlan = ticketPlans.find(plan => plan.id === 'vip');
    if (!vipPlan) {
      showToast('VIP upgrade not available at this time', 'error');
      return;
    }

    removeFromCart(standardTicketItem.id);
    addToCart({
      id: vipPlan.id,
      title: vipPlan.title,
      price: vipPlan.price / 100,
      currency: vipPlan.currency,
      priceId: vipPlan.priceId,
      variant: 'vip',
    }, standardTicketItem.quantity);

    showToast('Upgraded to VIP! 🎉', 'success');
  };

  const handleAttendeesSubmit = (attendeeData: AttendeeInfo[]) => {
    setAttendees(attendeeData);
    setCurrentStep(showWorkshopUpsells ? 'upsells' : 'checkout');
  };

  const handleCheckoutSubmit = (data: CheckoutFormData) => {
    analytics.identify(data.email, {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      name: `${data.firstName} ${data.lastName}`.trim(),
      company: data.company || undefined,
      job_title: data.jobTitle || undefined,
    });

    analytics.track('checkout_started', {
      cart_item_count: cart.items.length,
      cart_total_amount: orderSummary.total,
      cart_currency: orderSummary.currency,
      cart_items: mapCartItemsToAnalytics(cart.items),
      email: data.email,
      company: data.company,
    } as EventProperties<'checkout_started'>);

    setCheckoutCompleted(true);
    createCheckout({
      cart,
      customerInfo: { ...data, attendees },
    });
  };

  const handleContinueFromReview = () => {
    analytics.track('cart_reviewed', {
      cart_item_count: cart.items.length,
      cart_total_amount: orderSummary.total,
      cart_currency: orderSummary.currency,
      cart_items: mapCartItemsToAnalytics(cart.items),
    } as EventProperties<'cart_reviewed'>);

    if (needsAttendeeInfo) setCurrentStep('attendees');
    else if (showWorkshopUpsells) setCurrentStep('upsells');
    else setCurrentStep('checkout');
  };

  const handleCheckoutBack = () => {
    if (showWorkshopUpsells) setCurrentStep('upsells');
    else if (needsAttendeeInfo) setCurrentStep('attendees');
    else setCurrentStep('review');
  };

  // Cart abandonment tracking
  useCartAbandonment({
    enabled: !isEmpty && !checkoutCompleted,
    currentStep,
    cartData: {
      items: cart.items,
      total: orderSummary.total,
      currency: orderSummary.currency,
    },
    userEmail: capturedEmail,
    onAbandonment: (data) => {
      if (data.email) {
        scheduleAbandonmentEmail({
          email: data.email,
          cartItems: cart.items.map(({ title, quantity, price, currency }) => ({
            title, quantity, price, currency,
          })),
          cartTotal: orderSummary.total,
          currency: orderSummary.currency,
          encodedCartState: encodeCartState(cart),
        });
      }
    },
  });

  // Track step views
  useEffect(() => {
    analytics.track('cart_step_viewed', {
      step: currentStep,
      cart_item_count: cart.items.length,
      cart_total_amount: orderSummary.total,
    } as EventProperties<'cart_step_viewed'>);

    if (currentStep === 'upsells' && showWorkshopUpsells) {
      analytics.track('workshop_upsell_viewed', {
        bonus_percent: bonusPercent,
        available_vouchers: workshopVouchers.length,
        current_stage: currentStage || 'unknown',
      } as EventProperties<'workshop_upsell_viewed'>);
    }
  }, [currentStep, cart.items.length, orderSummary.total, showWorkshopUpsells, bonusPercent, workshopVouchers.length, currentStage]);

  // Track cart recovery visits
  useEffect(() => {
    const { utm_campaign, utm_source, utm_medium } = router.query;
    if (!hasTrackedRecovery.current && utm_campaign === 'cart_recovery' && utm_source === 'email' && cart.items.length > 0) {
      hasTrackedRecovery.current = true;
      analytics.track('cart_recovery_clicked', {
        cart_item_count: cart.items.length,
        cart_total_amount: orderSummary.total,
        cart_currency: orderSummary.currency,
        cart_items: mapCartItemsToAnalytics(cart.items),
        utm_source: utm_source as string,
        utm_medium: (utm_medium as string) || 'abandonment',
        utm_campaign: utm_campaign as string,
      } as EventProperties<'cart_recovery_clicked'>);
    }
  }, [router.query, cart.items, orderSummary.total, orderSummary.currency]);

  if (isEmpty) {
    return <EmptyCartState />;
  }

  return (
    <>
      <Head>
        <title>Your Tickets | ZurichJS Conference 2026</title>
      </Head>

      <div className="min-h-screen bg-brand-black">
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
            <CartProgressSteps
              currentStep={currentStep}
              needsAttendeeInfo={needsAttendeeInfo}
              showWorkshopUpsells={showWorkshopUpsells}
              isPricingLoading={isPricingLoading}
              onStepClick={setCurrentStep}
            />
          </SectionContainer>
        </div>

        {/* Main Content */}
        <SectionContainer className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <AnimatePresence mode="wait">
            {currentStep === 'review' && (
              <ReviewStep
                cart={cart}
                orderSummary={orderSummary}
                ticketItems={ticketItems}
                ticketPlans={ticketPlans}
                isPartialDiscount={isPartialDiscount}
                showVipUpsell={showVipUpsell}
                showTeamUpsell={showTeamUpsell}
                onNext={handleContinueFromReview}
                onQuantityChange={updateItemQuantity}
                onRemove={removeFromCart}
                onApplyVoucher={applyVoucher}
                onRemoveVoucher={removeVoucher}
                onUpgradeToVip={handleUpgradeToVip}
                onTeamRequest={handleTeamModalOpen}
              />
            )}

            {currentStep === 'attendees' && needsAttendeeInfo && (
              <AttendeeForm
                cartItems={ticketItems}
                initialAttendees={attendees}
                onSubmit={handleAttendeesSubmit}
                onBack={() => setCurrentStep('review')}
              />
            )}

            {currentStep === 'upsells' && showWorkshopUpsells && (
              <UpsellsStep
                workshopVouchers={workshopVouchers}
                bonusPercent={bonusPercent}
                needsAttendeeInfo={needsAttendeeInfo}
                onNext={() => setCurrentStep('checkout')}
                onBack={() => setCurrentStep(needsAttendeeInfo ? 'attendees' : 'review')}
                onAddVoucher={handleAddWorkshopVoucher}
                onSkip={() => setCurrentStep('checkout')}
              />
            )}

            {currentStep === 'checkout' && (
              <CheckoutStep
                cart={cart}
                orderSummary={orderSummary}
                attendees={attendees}
                isPartialDiscount={isPartialDiscount}
                showWorkshopUpsells={showWorkshopUpsells}
                needsAttendeeInfo={needsAttendeeInfo}
                isSubmitting={isSubmitting}
                error={error}
                onNext={() => {}}
                onBack={handleCheckoutBack}
                onRemove={removeFromCart}
                onRemoveVoucher={removeVoucher}
                onSubmit={handleCheckoutSubmit}
                onEmailCaptured={setCapturedEmail}
              />
            )}
          </AnimatePresence>
        </SectionContainer>

        <ToastContainer toasts={toasts} />

        {teamTicketInfo && (
          <TeamRequestModal
            isOpen={showTeamModal}
            onClose={closeTeamModal}
            ticketType={teamTicketInfo.type}
            quantity={teamTicketInfo.quantity}
            onSubmit={handleTeamRequestSubmit}
            onSuccess={handleTeamRequestSuccess}
          />
        )}

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
 * Server-side props - Prefetch pricing data, workshop vouchers, and decode cart from URL
 */
export const getServerSideProps: GetServerSideProps = async ({ query, req }) => {
  const queryClient = createQueryClient();
  const countryCode = detectCountryFromRequest(req);
  const detectedCurrency = getCurrencyFromCountry(countryCode);

  const encodedCart = typeof query.cart === 'string' ? query.cart : undefined;
  let initialCart = encodedCart ? decodeCartState(encodedCart) : createEmptyCart(detectedCurrency);

  if (initialCart && initialCart.currency !== detectedCurrency) {
    initialCart = { ...initialCart, currency: detectedCurrency };
  }

  try {
    await Promise.all([
      queryClient.prefetchQuery(createTicketPricingQueryOptions(detectedCurrency)),
      queryClient.prefetchQuery(workshopVouchersQueryOptions),
    ]);
  } catch (error) {
    console.error('Failed to prefetch data:', error);
  }

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
      initialCart: initialCart ?? createEmptyCart(detectedCurrency),
      detectedCurrency,
    },
  };
};
