import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/Layout';
import { Heading, Kicker, Button } from '@/components/atoms';
import Link from 'next/link';

/**
 * Session details retrieved from Stripe
 */
interface SessionDetails {
  customer_email?: string;
  customer_name?: string;
  amount_total?: number;
  currency?: string;
  payment_status?: string;
  session_id?: string;
  error?: string;
}

/**
 * Success Page
 * Displayed after successful Stripe checkout
 * Shows order confirmation and next steps
 */
const SuccessPage: React.FC = () => {
  const router = useRouter();
  const { session_id } = router.query;
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (!session_id || typeof session_id !== 'string') {
        setError('No session ID provided');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/checkout/session?session_id=${session_id}`);
        const data: SessionDetails = await response.json();

        if (!response.ok || data.error) {
          throw new Error(data.error || 'Failed to fetch session details');
        }

        setSessionDetails(data);
      } catch (err) {
        console.error('Error fetching session details:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionDetails();
  }, [session_id]);

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

  return (
    <Layout
      title="Payment Successful | ZurichJS Conference 2026"
      description="Your ticket purchase was successful. Check your email for confirmation details."
    >
      <div className="min-h-screen bg-brand-primary py-16 md:py-24 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Loading State */}
          {isLoading && (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
              <p className="mt-4 text-black">Loading your order details...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="text-center">
              <div className="mb-8">
                <div className="text-6xl mb-4">⚠️</div>
                <Kicker variant="light" className="mb-4">
                  Error
                </Kicker>
                <Heading level="h1" variant="light" className="mb-6 text-black">
                  Something went wrong
                </Heading>
                <p className="text-lg text-black/80 mb-8">
                  {error}
                </p>
              </div>
              <Link href="/">
                <Button variant="primary" size="large">
                  Return to Homepage
                </Button>
              </Link>
            </div>
          )}

          {/* Success State */}
          {!isLoading && !error && sessionDetails && (
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
                <h2 className="text-2xl font-bold text-brand-primary mb-6">Order Details</h2>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-800">
                    <span className="text-gray-400">Order Number</span>
                    <span className="text-white font-semibold font-mono">
                      {getOrderNumber(sessionDetails.session_id)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-800">
                    <span className="text-gray-400">Customer Name</span>
                    <span className="text-white">{sessionDetails.customer_name || 'N/A'}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-800">
                    <span className="text-gray-400">Email</span>
                    <span className="text-white">{sessionDetails.customer_email || 'N/A'}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-800">
                    <span className="text-gray-400">Amount Paid</span>
                    <span className="text-white font-semibold">
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
                <h2 className="text-2xl font-bold text-brand-primary mb-6">What's Next?</h2>

                <div className="space-y-4 text-gray-200">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center text-black font-bold">
                      1
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Check Your Email</h3>
                      <p className="text-gray-400">
                        We've sent a confirmation email with your ticket details and invoice to{' '}
                        <span className="text-white">{sessionDetails.customer_email}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center text-black font-bold">
                      2
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Save the Date</h3>
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
                      <h3 className="text-white font-semibold mb-1">Stay Updated</h3>
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
                      <h3 className="text-white font-semibold mb-1">Join Our Community</h3>
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
                      <Link href="/refund-policy" className="text-brand-primary hover:underline">
                        refund policy
                      </Link>
                      {' '}for cancellation terms
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-primary mt-1">•</span>
                    <span>Contact us at tickets@zurichjs.com for any questions</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/">
                  <Button variant="primary" size="large" className="w-full sm:w-auto">
                    Return to Homepage
                  </Button>
                </Link>
                <Link href="/#schedule">
                  <Button variant="secondary" size="large" className="w-full sm:w-auto">
                    View Schedule
                  </Button>
                </Link>
              </div>

              {/* Support Contact */}
              <div className="mt-12 pt-8 border-t border-black/20 text-center">
                <p className="text-black/70">
                  Questions? Contact us at{' '}
                  <a
                    href="mailto:tickets@zurichjs.com"
                    className="text-black hover:underline font-bold transition-colors"
                  >
                    tickets@zurichjs.com
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
