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
import type { GetServerSideProps } from 'next';

import { useCart } from '@/contexts/CartContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTicketPricing } from '@/hooks/useTicketPricing';
import { useCheckout } from '@/hooks/useCheckout';
import { useToast } from '@/hooks/useToast';
import { useCartUrlSync } from '@/hooks/useCartUrlState';
import { useTeamRequest } from '@/hooks/useTeamRequest';
import { useCartAbandonment } from '@/hooks/useCartAbandonment';
import { useCartAbandonmentEmail } from '@/hooks/useCartAbandonmentEmail';
import { useLocalStorage } from '@/hooks/useLocalStorage';

import { encodeCartState } from '@/lib/cart-url-state';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';
import { mapCartItemsToAnalytics } from '@/lib/analytics/helpers';
import { calculateOrderSummary } from '@/lib/cart';
import { createTicketPricingQueryOptions } from '@/lib/queries/tickets';
import { createQueryClient } from '@/lib/query-client';
import { createPrefetch } from '@/lib/prefetch';
import { decodeCartState, createEmptyCart } from '@/lib/cart-url-state';
import { detectCountryFromRequest } from '@/lib/geo/detect-country';
import { getCurrencyFromCountry } from '@/config/currency';

import { ToastContainer, TeamRequestModal, TeamRequestSuccessDialog, AttendeeForm } from '@/components/molecules';
import { SectionContainer } from '@/components/organisms';
import {
  EmptyCartState,
  CartProgressSteps,
  ReviewStep,
  CheckoutStep,
  PaymentStep,
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
  const [currentStep, setCurrentStep] = useState<CartStep>('review');
  const [attendees, setAttendees] = useState<AttendeeInfo[]>([]);
  const [workshopAttendees, setWorkshopAttendees] = useState<Record<string, AttendeeInfo[]>>({});
  const [capturedEmail, setCapturedEmail] = useState<string | null>(null);
  const [capturedFirstName, setCapturedFirstName] = useState<string | null>(null);
  const { mutate: createCheckout, isPending: isSubmitting, error } = useCheckout();
  const { mutate: scheduleAbandonmentEmail } = useCartAbandonmentEmail();
  const [checkoutFinalizing, setCheckoutFinalizing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [savedBillingData, saveBillingData] = useLocalStorage('zurichjs_billing_data');
  const [, saveCartForRecovery] = useLocalStorage('zurichjs_cart_recovery');
  const { toasts, showToast } = useToast();
  const router = useRouter();
  const hasTrackedRecovery = useRef(false);

  useCartUrlSync(cart);

  const orderSummary = calculateOrderSummary(cart);
  const isEmpty = cart.items.length === 0;
  const isPartialDiscount = cart.applicablePriceIds !== undefined &&
    cart.applicablePriceIds.length > 0 &&
    cart.applicablePriceIds.length < cart.items.length;

  const ticketItems = cart.items.filter(
    (item) => item.kind !== 'workshop'
  );
  const workshopItems = cart.items.filter((item) => item.kind === 'workshop');
  const ticketCount = ticketItems.reduce((sum, item) => sum + item.quantity, 0);
  const workshopSeatCount = workshopItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalSeatCount = ticketCount + workshopSeatCount;
  const attendeeItems = [...ticketItems, ...workshopItems];
  // Gather per-seat attendee info whenever there's more than one seat (across
  // tickets + workshop seats), mirroring how tickets work today.
  const needsAttendeeInfo = totalSeatCount > 1;
  const purchaseType = ticketCount > 0 && workshopSeatCount > 0
    ? 'mixed'
    : workshopSeatCount > 0
      ? 'workshop'
      : 'ticket';
  const hasDiscount = orderSummary.discount > 0;

  // VIP upsell logic
  const standardTicketItem = cart.items.find(item => item.variant === 'standard' && !item.title.includes('Workshop'));
  const showVipUpsell = ticketCount >= 1 && ticketCount <= 2 && !!standardTicketItem;

  // Team upsell logic — include workshop seats so bulk workshop purchases
  // trigger the team workflow too.
  const showTeamUpsell = totalSeatCount >= 3 && !cart.couponCode;

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
    if (totalSeatCount >= 3) {
      const summary = [
        ...ticketItems.map((t) => `${t.title} × ${t.quantity}`),
        ...workshopItems.map((w) => `Workshop: ${w.title} × ${w.quantity}`),
      ].join(', ');
      openTeamModal(summary, totalSeatCount);
    }
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

  const handleAttendeesSubmit = (result: {
    attendees: AttendeeInfo[];
    workshopAttendees: Record<string, AttendeeInfo[]>;
  }) => {
    setAttendees(result.attendees);
    setWorkshopAttendees(result.workshopAttendees);
    setCurrentStep('checkout');
  };

  const hasRequiredAttendeeInfo = () => {
    if (!needsAttendeeInfo) return true;

    const hasDetails = (attendee: AttendeeInfo | undefined) =>
      !!attendee?.firstName?.trim() &&
      !!attendee.lastName?.trim() &&
      !!attendee.email?.trim();

    if (attendees.length < ticketCount || attendees.slice(0, ticketCount).some((attendee) => !hasDetails(attendee))) {
      return false;
    }

    return workshopItems.every((item) => {
      if (!item.workshopId) return false;
      const itemAttendees = workshopAttendees[item.workshopId] ?? [];
      return itemAttendees.length >= item.quantity &&
        itemAttendees.slice(0, item.quantity).every((attendee) => hasDetails(attendee));
    });
  };

  const requireAttendeeInfoBeforeCheckout = () => {
    if (hasRequiredAttendeeInfo()) return true;
    showToast('Please add attendee details for every seat before checkout.', 'error');
    setCurrentStep('attendees');
    return false;
  };

  const handleCheckoutSubmit = (data: CheckoutFormData) => {
    if (!requireAttendeeInfoBeforeCheckout()) return;

    // Persist billing data so it survives back-navigation from payment step
    saveBillingData({
      email: data.email, phone: data.phone, firstName: data.firstName,
      lastName: data.lastName, company: data.company, jobTitle: data.jobTitle,
      addressLine1: data.addressLine1, addressLine2: data.addressLine2,
      city: data.city, state: data.state, postalCode: data.postalCode,
      country: data.country, subscribeNewsletter: data.subscribeNewsletter,
    });

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
      cart_total: orderSummary.total,
      cart_currency: orderSummary.currency,
      currency: orderSummary.currency,
      cart_items: mapCartItemsToAnalytics(cart.items),
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      company: data.company,
      job_title: data.jobTitle,
      ticket_count: ticketCount,
      workshop_count: workshopSeatCount,
      seat_count: totalSeatCount,
      has_discount: hasDiscount,
      coupon_code: cart.couponCode,
      purchase_type: purchaseType,
      payment_ui: 'embedded_checkout',
    } as EventProperties<'checkout_started'>);

    createCheckout(
      { cart, customerInfo: { ...data, attendees, workshopAttendees } },
      {
        onSuccess: (response) => {
          setClientSecret(response.clientSecret);
          setCheckoutSessionId(response.sessionId);
          saveCartForRecovery(encodeCartState(cart));
          setCurrentStep('payment');
        },
      }
    );
  };

  const handleContinueFromReview = () => {
    analytics.track('cart_reviewed', {
      cart_item_count: cart.items.length,
      cart_total_amount: orderSummary.total,
      cart_currency: orderSummary.currency,
      cart_items: mapCartItemsToAnalytics(cart.items),
    } as EventProperties<'cart_reviewed'>);

    if (needsAttendeeInfo) setCurrentStep('attendees');
    else setCurrentStep('checkout');
  };

  const handleCheckoutBack = () => {
    if (needsAttendeeInfo) setCurrentStep('attendees');
    else setCurrentStep('review');
  };

  // Cart abandonment tracking
  useCartAbandonment({
    enabled: !isEmpty && !checkoutFinalizing,
    currentStep,
    cartData: {
      items: cart.items,
      total: orderSummary.total,
      currency: orderSummary.currency,
      discount: orderSummary.discount,
      couponCode: cart.couponCode,
      ticketCount,
      workshopCount: workshopSeatCount,
      seatCount: totalSeatCount,
      purchaseType,
    },
    userEmail: capturedEmail,
    userFirstName: capturedFirstName,
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
      cart_currency: orderSummary.currency,
      cart_items: mapCartItemsToAnalytics(cart.items),
      ticket_count: ticketCount,
      workshop_count: workshopSeatCount,
      seat_count: totalSeatCount,
      has_attendee_step: needsAttendeeInfo,
      has_discount: hasDiscount,
      coupon_code: cart.couponCode,
      purchase_type: purchaseType,
    } as EventProperties<'cart_step_viewed'>);
  }, [currentStep, cart.items, orderSummary.total, orderSummary.currency, ticketCount, workshopSeatCount, totalSeatCount, needsAttendeeInfo, hasDiscount, cart.couponCode, purchaseType]);

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
        {/* Progress Steps */}
        <div className="bg-brand-darkest pt-20 md:pt-24">
          <SectionContainer>
            <CartProgressSteps
              currentStep={currentStep}
              needsAttendeeInfo={needsAttendeeInfo}
              isPricingLoading={isPricingLoading}
              onStepClick={(step) => {
                // Prevent clicking directly to payment — must complete billing first
                if (step === 'payment') return;
                if (step === 'checkout' && !requireAttendeeInfoBeforeCheckout()) return;
                setCurrentStep(step);
              }}
            />
          </SectionContainer>
        </div>

        {/* Main Content */}
        <SectionContainer className="py-6 md:py-12">
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
                cartItems={attendeeItems}
                initialAttendees={attendees}
                initialWorkshopAttendees={workshopAttendees}
                onSubmit={handleAttendeesSubmit}
                onBack={() => setCurrentStep('review')}
              />
            )}

            {currentStep === 'checkout' && (
              <CheckoutStep
                cart={cart}
                orderSummary={orderSummary}
                attendees={attendees}
                isPartialDiscount={isPartialDiscount}
                needsAttendeeInfo={needsAttendeeInfo}
                isSubmitting={isSubmitting}
                error={error}
                savedBillingData={savedBillingData}
                onNext={() => {}}
                onBack={handleCheckoutBack}
                onRemove={removeFromCart}
                onRemoveVoucher={removeVoucher}
                onSubmit={handleCheckoutSubmit}
                onEmailCaptured={setCapturedEmail}
                onFieldCaptured={(fieldName, value) => {
                  if (fieldName === 'firstName') setCapturedFirstName(value);
                }}
              />
            )}

            {currentStep === 'payment' && clientSecret && (
              <PaymentStep
                clientSecret={clientSecret}
                sessionId={checkoutSessionId ?? undefined}
                cart={cart}
                orderSummary={orderSummary}
                totalAmount={orderSummary.total.toFixed(2)}
                currency={orderSummary.currency}
                onBack={() => {
                  setClientSecret(null);
                  setCheckoutSessionId(null);
                  setCheckoutFinalizing(false);
                  setCurrentStep('checkout');
                }}
                onPaymentSubmitting={() => setCheckoutFinalizing(true)}
                onPaymentFailed={() => setCheckoutFinalizing(false)}
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
  const { optionalQuery, dehydrate } = createPrefetch(queryClient);
  const countryCode = detectCountryFromRequest(req);
  const detectedCurrency = getCurrencyFromCountry(countryCode);

  const encodedCart = typeof query.cart === 'string' ? query.cart : undefined;
  let initialCart = encodedCart ? decodeCartState(encodedCart) : createEmptyCart(detectedCurrency);

  if (initialCart && initialCart.currency !== detectedCurrency) {
    initialCart = { ...initialCart, currency: detectedCurrency };
  }

  // Optional prefetch — if it fails or exceeds 1s timeout,
  // the page renders and useTicketPricing refetches client-side
  await Promise.allSettled([
    optionalQuery(createTicketPricingQueryOptions(detectedCurrency)),
  ]);

  return {
    props: {
      dehydratedState: dehydrate(),
      initialCart: initialCart ?? createEmptyCart(detectedCurrency),
      detectedCurrency,
    },
  };
};
