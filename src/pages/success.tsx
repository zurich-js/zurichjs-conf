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

/**
 * Success Page
 * Displayed after successful Stripe checkout
 * Shows order confirmation and next steps
 */
const SuccessPage: React.FC = () => {
  const router = useRouter();
  const { session_id } = router.query;

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
      revenue_type: 'ticket',
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

          {/* Error State - Router ready but no session_id OR API error */}
          {router.isReady && (!sessionId || error) && (
            <div className="text-center">
              <div className="mb-8">
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
                        <span>Your payment was processed successfully - you&apos;ll receive your ticket via email</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-brand-primary mt-1">•</span>
                        <span>If you don&apos;t receive an email within 10 minutes, contact us at hello@zurichjs.com</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <Link href="/">
                <Button variant="dark" size="lg">
                  Return to Homepage
                </Button>
              </Link>
            </div>
          )}

          {/* Success State */}
          {router.isReady && !isLoading && !error && sessionDetails && (
            <>
              {/* Success Header */}
              <div className="text-center mb-12">
                <div className="text-6xl mb-4">🎉</div>
                <Kicker variant="light" className="mb-4">
                  Payment Successful
                </Kicker>
                <Heading level="h1" variant="light" className="mb-6 text-black">
                  Thank you for your purchase!
                </Heading>
                <p className="text-lg text-black/80">
                  Your ticket for ZurichJS Conference 2026 has been confirmed.
                  A confirmation email has been sent to{' '}
                  <strong className="text-black">{sessionDetails.customer_email}</strong>
                </p>
              </div>

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
                        We&apos;ve sent a confirmation email with your ticket details and invoice to{' '}
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
                        ZurichJS Conference 2026 will be held in Zurich. Mark your calendar and make your travel arrangements.
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
                  <li className="flex items-start gap-2">
                    <span className="text-brand-primary mt-1">•</span>
                    <span>Your ticket is non-transferable without prior authorization</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-primary mt-1">•</span>
                    <span>Please bring a valid photo ID matching the name on your ticket</span>
                  </li>
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
              <div className="flex justify-center">
                <Link href="/">
                  <Button variant="dark" size="lg">
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
