import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Heading, Kicker, Button } from '@/components/atoms';
import { PageHeader } from '@/components/organisms';
import Link from 'next/link';
import { checkoutSessionQueryOptions } from '@/lib/queries/checkout';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';

import { ApiError } from '@/lib/api';
import { useLocalStorage } from '@/hooks/useLocalStorage';

/**
 * Detect if the error is a payment failure (402) vs a generic API/network error.
 */
function isPaymentFailure(error: Error | null | undefined): boolean {
  if (!error) return false;
  if (error instanceof ApiError && error.statusCode === 402) return true;
  const msg = error.message.toLowerCase();
  return msg.includes('payment') || msg.includes('expired') || msg.includes('not completed');
}

/**
 * Success Page
 * Displayed after successful Stripe checkout, or shows failure state
 * for incomplete/failed payments.
 */
const SuccessPage: React.FC = () => {
  const router = useRouter();
  const { session_id } = router.query;
  const [savedCart] = useLocalStorage('zurichjs_cart_recovery');

  // Wait for router to be ready and extract session_id
  const sessionId = router.isReady && typeof session_id === 'string' ? session_id : '';

  // Use TanStack Query to fetch session details
  const { data: sessionDetails, isLoading, error } = useQuery(
    checkoutSessionQueryOptions(sessionId)
  );

  // Generate order number from session ID (matching webhook logic)
  const getOrderNumber = (sessionId?: string): string => {
    if (!sessionId) return 'N/A';
    const last8 = sessionId.slice(-8).toUpperCase();
    return `ZJS-${last8}`;
  };

  // Format currency amount
  const formatAmount = (amount?: number, currency?: string): string => {
    if (!amount || !currency) return 'N/A';
    const formatted = (amount / 100).toFixed(2);
    const currencySymbol = currency.toUpperCase() === 'CHF' ? 'CHF' : '€';
    return `${currencySymbol} ${formatted}`;
  };

  // Track purchase completion (only once per session)
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track when we have session details and haven't tracked yet
    if (!router.isReady || isLoading || error || !sessionDetails || hasTracked.current) {
      return;
    }

    hasTracked.current = true;

    // Identify the user (links this purchase to their browsing session)
    if (sessionDetails.customer_email) {
      analytics.identify(sessionDetails.customer_email, {
        email: sessionDetails.customer_email,
        name: sessionDetails.customer_name || undefined,
      });
    }

    // Track checkout completion on client-side
    // This complements the server-side webhook tracking and enables client-side funnel analysis
    analytics.track('checkout_completed', {
      cart_item_count: 1, // We don't have line items here, default to 1
      cart_total_amount: sessionDetails.amount_total || 0,
      cart_currency: sessionDetails.currency?.toUpperCase() || 'CHF',
      cart_items: [], // Line items not available on success page
      stripe_session_id: sessionDetails.session_id,
      payment_status: 'succeeded',
      revenue_amount: sessionDetails.amount_total || 0,
      revenue_currency: sessionDetails.currency?.toUpperCase() || 'CHF',
      revenue_type: sessionDetails.purchase_type || 'ticket',
      transaction_id: sessionDetails.session_id,
      email: sessionDetails.customer_email,
    } as EventProperties<'checkout_completed'>);

    // Also track as a page view with purchase context
    analytics.track('page_viewed', {
      page_path: '/success',
      page_name: 'Purchase Success',
      page_category: 'checkout',
    } as EventProperties<'page_viewed'>);

  }, [router.isReady, isLoading, error, sessionDetails]);

  return (
    <Layout
      title="Payment Successful | ZurichJS Conference 2026"
      description="Your ticket purchase was successful. Check your email for confirmation details."
    >
      <PageHeader />
      <div className="min-h-screen bg-brand-primary py-16 md:py-24 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Loading State - Show while router is not ready OR while fetching */}
          {(!router.isReady || isLoading) && (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
              <p className="mt-4 text-black">Loading your order details...</p>
            </div>
          )}

          {/* Error State - Payment failed, session expired, or missing data */}
          {router.isReady && (!sessionId || error) && (
            <div className="text-center">
              <div className="mb-8">
                {isPaymentFailure(error) ? (
                  <>
                    <div className="text-6xl mb-4">❌</div>
                    <Kicker variant="light" className="mb-4">
                      Payment Not Completed
                    </Kicker>
                    <Heading level="h1" variant="light" className="mb-6 text-black">
                      Your payment was not successful
                    </Heading>
                    <div className="max-w-xl mx-auto">
                      <p className="text-lg text-black/80 mb-4">
                        {error instanceof Error ? error.message : 'The payment could not be processed.'}
                      </p>
                      <div className="bg-black rounded-2xl p-6 text-left mb-8">
                        <h3 className="text-brand-primary font-semibold mb-3">What you can do:</h3>
                        <ul className="text-gray-200 space-y-2">
                          <li className="flex items-start gap-2">
                            <span className="text-brand-primary mt-1">•</span>
                            <span>Return to the cart and try a different payment method</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-brand-primary mt-1">•</span>
                            <span>Check that your payment method has sufficient funds</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-brand-primary mt-1">•</span>
                            <span>Contact us at hello@zurichjs.com if the problem persists</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">⚠️</div>
                    <Kicker variant="light" className="mb-4">
                      Error Loading Order Details
                    </Kicker>
                    <Heading level="h1" variant="light" className="mb-6 text-black">
                      Unable to Load Order Information
                    </Heading>
                    <div className="max-w-xl mx-auto">
                      <p className="text-lg text-black/80 mb-4">
                        {!sessionId
                          ? 'No session ID found in the URL. Please use the link from your confirmation email.'
                          : error instanceof Error
                            ? error.message
                            : 'An unexpected error occurred while loading your order details.'}
                      </p>
                      <div className="bg-black rounded-2xl p-6 text-left mb-8">
                        <h3 className="text-brand-primary font-semibold mb-3">What you can do:</h3>
                        <ul className="text-gray-200 space-y-2">
                          <li className="flex items-start gap-2">
                            <span className="text-brand-primary mt-1">•</span>
                            <span>Check your email for the confirmation message with your order details</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-brand-primary mt-1">•</span>
                            <span>If you don&apos;t receive an email within 10 minutes, contact us at hello@zurichjs.com</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                {isPaymentFailure(error) && (
                  <a href={savedCart ? `/cart?cart=${savedCart}` : '/cart'}>
                    <Button variant="accent" size="lg" className="w-full sm:w-auto">
                      Try Again
                    </Button>
                  </a>
                )}
                <Link href="/">
                  <Button variant="blue" size="lg" className="w-full sm:w-auto">
                    Return to Homepage
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Success State */}
          {router.isReady && !isLoading && !error && sessionDetails && (
            <>
              {/* Success Header */}
              <div className="text-center mb-12">
                <div className="text-6xl mb-4">{sessionDetails.purchase_type === 'workshop' ? '🎓' : '🎉'}</div>
                <Kicker variant="light" className="mb-4">
                  Payment Successful
                </Kicker>
                <Heading level="h1" variant="light" className="mb-6 text-black">
                  Thank you for your purchase!
                </Heading>
                <p className="text-lg text-black/80">
                  {sessionDetails.purchase_type === 'workshop'
                    ? 'Your workshop seat has been confirmed.'
                    : sessionDetails.purchase_type === 'mixed'
                      ? 'Your conference ticket and workshop seat have been confirmed.'
                      : 'Your ticket for ZurichJS Conference 2026 has been confirmed.'}
                  {' '}A confirmation email has been sent to{' '}
                  <strong className="text-black">{sessionDetails.customer_email}</strong>
                </p>
              </div>

              {/* Purchased Items */}
              {sessionDetails.line_items && sessionDetails.line_items.length > 0 && (
                <div className="bg-black rounded-2xl p-8 mb-8">
                  <h2 className="text-xl font-bold text-brand-primary mb-6">Your Purchase</h2>
                  <div className="space-y-3">
                    {sessionDetails.line_items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-3 border-b border-gray-800 last:border-b-0">
                        <div>
                          <span className="text-brand-white">{item.description}</span>
                          {item.quantity > 1 && (
                            <span className="text-gray-400 ml-2">x{item.quantity}</span>
                          )}
                        </div>
                        <span className="text-brand-white font-semibold">
                          {formatAmount(item.amount, sessionDetails.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Details Card */}
              <div className="bg-black rounded-2xl p-8 mb-8">
                <h2 className="text-xl font-bold text-brand-primary mb-6">Order Details</h2>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-800">
                    <span className="text-gray-400">Order Number</span>
                    <span className="text-brand-white font-semibold font-mono">
                      {getOrderNumber(sessionDetails.session_id)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-800">
                    <span className="text-gray-400">Customer Name</span>
                    <span className="text-brand-white">{sessionDetails.customer_name || 'N/A'}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-800">
                    <span className="text-gray-400">Email</span>
                    <span className="text-brand-white">{sessionDetails.customer_email || 'N/A'}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-800">
                    <span className="text-gray-400">Amount Paid</span>
                    <span className="text-brand-white font-semibold">
                      {formatAmount(sessionDetails.amount_total, sessionDetails.currency)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3">
                    <span className="text-gray-400">Payment Status</span>
                    <span className="text-success-light font-semibold">
                      {sessionDetails.payment_status === 'paid' ? '✓ Paid' : sessionDetails.payment_status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-black rounded-2xl p-8 mb-8">
                <h2 className="text-xl font-bold text-brand-primary mb-6">What&apos;s Next?</h2>

                <div className="space-y-4 text-gray-200">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center text-black font-bold">
                      1
                    </div>
                    <div>
                      <h3 className="text-brand-white font-semibold mb-1">Check Your Email</h3>
                      <p className="text-gray-400">
                        We&apos;ve sent a confirmation email with your {sessionDetails.purchase_type === 'workshop' ? 'workshop' : sessionDetails.purchase_type === 'mixed' ? 'ticket and workshop' : 'ticket'} details to{' '}
                        <span className="text-brand-white">{sessionDetails.customer_email}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center text-black font-bold">
                      2
                    </div>
                    <div>
                      <h3 className="text-brand-white font-semibold mb-1">Save the Date</h3>
                      <p className="text-gray-400">
                        {sessionDetails.purchase_type === 'workshop'
                          ? 'ZurichJS Engineering Day takes place on September 10, 2026. Mark your calendar!'
                          : 'ZurichJS Conference 2026 will be held in Zurich. Mark your calendar and make your travel arrangements.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center text-black font-bold">
                      3
                    </div>
                    <div>
                      <h3 className="text-brand-white font-semibold mb-1">Stay Updated</h3>
                      <p className="text-gray-400">
                        Keep an eye on your email for speaker announcements, schedule updates, and important event information.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center text-black font-bold">
                      4
                    </div>
                    <div>
                      <h3 className="text-brand-white font-semibold mb-1">Join Our Community</h3>
                      <p className="text-gray-400">
                        Connect with other attendees and speakers. Follow us on social media for the latest updates.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Important Information */}
              <div className="bg-black rounded-2xl p-8 mb-8">
                <h2 className="text-xl font-bold text-brand-primary mb-4">Important Information</h2>
                <ul className="space-y-2 text-gray-200">
                  {sessionDetails.purchase_type !== 'workshop' && (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="text-brand-primary mt-1">•</span>
                        <span>Your ticket is non-transferable without prior authorization</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-brand-primary mt-1">•</span>
                        <span>Please bring a valid photo ID matching the name on your ticket</span>
                      </li>
                    </>
                  )}
                  {(sessionDetails.purchase_type === 'workshop' || sessionDetails.purchase_type === 'mixed') && (
                    <li className="flex items-start gap-2">
                      <span className="text-brand-primary mt-1">•</span>
                      <span>Workshop seating is limited — arrive early to get settled in</span>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <span className="text-brand-primary mt-1">•</span>
                    <span>
                      Review our{' '}
                      <Link href="/info/refund-policy" className="text-brand-primary hover:underline">
                        refund policy
                      </Link>
                      {' '}for cancellation terms
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-primary mt-1">•</span>
                    <span>Contact us at hello@zurichjs.com for any questions</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                {(sessionDetails.purchase_type === 'workshop' || sessionDetails.purchase_type === 'mixed') && (
                  <Link href="/workshops">
                    <Button variant="accent" size="lg" className="w-full sm:w-auto">
                      Browse Workshops
                    </Button>
                  </Link>
                )}
                <Link href="/">
                  <Button variant="blue" size="lg" className="w-full sm:w-auto">
                    Return to Homepage
                  </Button>
                </Link>
              </div>

              {/* Support Contact */}
              <div className="mt-12 pt-8 border-t border-black/20 text-center">
                <p className="text-black/70">
                  Questions? Contact us at{' '}
                  <a
                    href="mailto:hello@zurichjs.com"
                    className="text-black hover:underline font-bold transition-colors"
                  >
                    hello@zurichjs.com
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default SuccessPage;
