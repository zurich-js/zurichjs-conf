import React from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Heading, Kicker, Button } from '@/components/atoms';
import { PageHeader } from '@/components/organisms';
import Link from 'next/link';
import type { OrderDetailsResponse } from '@/pages/api/orders/[token]';
import Image from 'next/image';

/**
 * Manage Order Page
 * Allows attendees to view and manage their order using a secure token from email
 */
const ManageOrderPage: React.FC = () => {
  const router = useRouter();
  const { token } = router.query;

  // Wait for router to be ready and extract token
  const orderToken = router.isReady && typeof token === 'string' ? token : '';

  // Fetch order details using the token
  const { data: orderDetails, isLoading, error } = useQuery<OrderDetailsResponse>({
    queryKey: ['order', orderToken],
    queryFn: async () => {
      if (!orderToken) throw new Error('No token provided');

      const response = await fetch(`/api/orders/${orderToken}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch order details');
      }
      return response.json();
    },
    enabled: !!orderToken,
  });

  // Format currency amount
  const formatAmount = (amount: number, currency: string): string => {
    const formatted = (amount / 100).toFixed(2);
    const currencySymbol = currency.toUpperCase() === 'CHF' ? 'CHF' : '€';
    return `${currencySymbol} ${formatted}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'confirmed':
        return 'text-success-light';
      case 'pending':
        return 'text-yellow-400';
      case 'cancelled':
        return 'text-red-400';
      case 'refunded':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  // Get status label
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'confirmed':
        return '✓ Confirmed';
      case 'pending':
        return '⏳ Pending';
      case 'cancelled':
        return '✗ Cancelled';
      case 'refunded':
        return '↺ Refunded';
      default:
        return status;
    }
  };

  return (
    <Layout
      title="Manage Your Order | ZurichJS Conference 2026"
      description="View and manage your ZurichJS Conference 2026 ticket order."
    >
      <PageHeader />
      <div className="min-h-screen bg-brand-primary py-16 md:py-24 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Loading State */}
          {(!router.isReady || isLoading) && (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
              <p className="mt-4 text-black">Loading your order...</p>
            </div>
          )}

          {/* Error State */}
          {router.isReady && (!orderToken || error) && (
            <div className="text-center">
              <div className="mb-8">
                <div className="text-6xl mb-4">🔒</div>
                <Kicker variant="light" className="mb-4">
                  Access Denied
                </Kicker>
                <Heading level="h1" variant="light" className="mb-6 text-black">
                  Unable to Access Order
                </Heading>
                <div className="max-w-xl mx-auto">
                  <p className="text-lg text-black/80 mb-4">
                    {!orderToken
                      ? 'No access token found. Please use the link from your confirmation email.'
                      : error instanceof Error
                        ? error.message
                        : 'An unexpected error occurred while loading your order.'}
                  </p>
                  <div className="bg-black rounded-2xl p-6 text-left mb-8">
                    <h3 className="text-brand-primary font-semibold mb-3">What you can do:</h3>
                    <ul className="text-gray-200 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-brand-primary mt-1">•</span>
                        <span>Check your email for the order management link</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-brand-primary mt-1">•</span>
                        <span>Make sure you&apos;re using the complete link from the email</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-brand-primary mt-1">•</span>
                        <span>Contact us at hello@zurichjs.com if you need assistance</span>
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
          {router.isReady && !isLoading && !error && orderDetails && (
            <>
              {/* Header */}
              <div className="text-center mb-12">
                <div className="text-6xl mb-4">🎫</div>
                <Kicker variant="light" className="mb-4">
                  Your Ticket
                </Kicker>
                <Heading level="h1" variant="light" className="mb-6 text-black">
                  ZurichJS Conference 2026
                </Heading>
                <p className="text-lg text-black/80">
                  Ticket for <strong className="text-black">{orderDetails.ticket.first_name} {orderDetails.ticket.last_name}</strong>
                </p>
              </div>

              {/* Transfer Notice */}
              {orderDetails.transferInfo && (
                <div className="bg-blue-100 border-l-4 border-blue-500 rounded-lg p-6 mb-8">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">↗️</span>
                    <div>
                      <h3 className="text-blue-900 font-semibold mb-2">Transferred Ticket</h3>
                      <p className="text-blue-800 text-sm">
                        This ticket was transferred to you by{' '}
                        <strong>{orderDetails.transferInfo.transferredFrom}</strong>{' '}
                        ({orderDetails.transferInfo.transferredFromEmail}) on{' '}
                        {formatDate(orderDetails.transferInfo.transferredAt)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* QR Code Card */}
              {orderDetails.ticket.qr_code_url && (
                <div className="bg-black rounded-2xl p-8 mb-8">
                  <h2 className="text-2xl font-bold text-brand-primary mb-6 text-center">Your Entry Pass</h2>
                  <div className="flex flex-col items-center">
                    <div className="bg-white p-6 rounded-xl mb-4">
                      <Image
                        src={orderDetails.ticket.qr_code_url}
                        alt="Ticket QR Code"
                        width={300}
                        height={300}
                        className="w-64 h-64"
                      />
                    </div>
                    <p className="text-gray-400 text-sm text-center max-w-md">
                      Present this QR code at the venue entrance for check-in. You can also show this from your email or download the PDF ticket.
                    </p>
                  </div>
                </div>
              )}

              {/* Ticket Details Card */}
              <div className="bg-black rounded-2xl p-8 mb-8">
                <h2 className="text-2xl font-bold text-brand-primary mb-6">Ticket Details</h2>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-800">
                    <span className="text-gray-400">Ticket ID</span>
                    <span className="text-white font-semibold font-mono text-sm">
                      {orderDetails.ticket.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-800">
                    <span className="text-gray-400">Attendee Name</span>
                    <span className="text-white">{orderDetails.ticket.first_name} {orderDetails.ticket.last_name}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-800">
                    <span className="text-gray-400">Email</span>
                    <span className="text-white">{orderDetails.ticket.email}</span>
                  </div>

                  {orderDetails.ticket.company && (
                    <div className="flex justify-between items-center py-3 border-b border-gray-800">
                      <span className="text-gray-400">Company</span>
                      <span className="text-white">{orderDetails.ticket.company}</span>
                    </div>
                  )}

                  {orderDetails.ticket.job_title && (
                    <div className="flex justify-between items-center py-3 border-b border-gray-800">
                      <span className="text-gray-400">Job Title</span>
                      <span className="text-white">{orderDetails.ticket.job_title}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-3 border-b border-gray-800">
                    <span className="text-gray-400">Ticket Type</span>
                    <span className="text-white capitalize">{orderDetails.ticket.ticket_category} - {orderDetails.ticket.ticket_stage.replace('_', ' ')}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-800">
                    <span className="text-gray-400">Amount Paid</span>
                    <span className="text-white font-semibold">
                      {formatAmount(orderDetails.ticket.amount_paid, orderDetails.ticket.currency)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-800">
                    <span className="text-gray-400">Purchase Date</span>
                    <span className="text-white">{formatDate(orderDetails.ticket.created_at)}</span>
                  </div>

                  <div className="flex justify-between items-center py-3">
                    <span className="text-gray-400">Status</span>
                    <span className={`font-semibold ${getStatusColor(orderDetails.ticket.status)}`}>
                      {getStatusLabel(orderDetails.ticket.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Event Information */}
              <div className="bg-black rounded-2xl p-8 mb-8">
                <h2 className="text-2xl font-bold text-brand-primary mb-6">Event Information</h2>
                <div className="space-y-4 text-gray-200">
                  <div>
                    <h3 className="text-white font-semibold mb-1">📅 Date & Time</h3>
                    <p className="text-gray-400">September 11, 2026</p>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">📍 Venue</h3>
                    <p className="text-gray-400">
                      Technopark Zürich<br />
                      Technoparkstrasse 1<br />
                      8005 Zürich, Switzerland
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-black rounded-2xl p-8 mb-8">
                <h2 className="text-2xl font-bold text-brand-primary mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a
                    href={`/api/calendar/${orderDetails.ticket.id}`}
                    className="flex items-center justify-center gap-2 bg-brand-primary text-black font-semibold py-3 px-6 rounded-lg hover:bg-brand-primary/90 transition-colors"
                  >
                    📅 Add to Calendar
                  </a>
                  <a
                    href="https://maps.google.com/?q=Technopark+Zürich"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    📍 View Map
                  </a>
                </div>
              </div>

              {/* Important Information */}
              <div className="bg-black rounded-2xl p-8 mb-8">
                <h2 className="text-xl font-bold text-brand-primary mb-4">Important Information</h2>
                <ul className="space-y-2 text-gray-200">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-primary mt-1">•</span>
                    <span>Bring this QR code (digital or printed) to the venue for check-in</span>
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
                    <span>Contact us at hello@zurichjs.com for any questions or to request a transfer</span>
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
                  Need help? Contact us at{' '}
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

export default ManageOrderPage;
