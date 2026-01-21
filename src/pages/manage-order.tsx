/**
 * Manage Ticket Page
 * Allows attendees to view and manage their ticket using a secure token from email
 */

import React from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Heading, Kicker, Button } from '@/components/atoms';
import { PageHeader } from '@/components/organisms';
import Link from 'next/link';
import {
  TicketQRCard,
  TicketDetailsCard,
  VipPerksCard,
  PendingUpgradeCard,
  UpgradeCta,
  ReassignModal,
  EventInfoCard,
  QuickActionsCard,
  TransferSection,
  ImportantInfoCard,
  formatDate,
  type ReassignData,
  type OrderDetailsResponse,
} from '@/components/manage-order';

const ManageOrderPage: React.FC = () => {
  const router = useRouter();
  const { token } = router.query;
  const [showReassignModal, setShowReassignModal] = React.useState(false);
  const [reassignData, setReassignData] = React.useState<ReassignData>({ email: '', firstName: '', lastName: '' });

  const orderToken = router.isReady && typeof token === 'string' ? token : '';

  // Fetch ticket details
  const {
    data: orderDetails,
    isLoading,
    error,
  } = useQuery<OrderDetailsResponse>({
    queryKey: ['order', orderToken],
    queryFn: async () => {
      if (!orderToken) throw new Error('No token provided');
      const response = await fetch(`/api/orders/${orderToken}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch ticket details');
      }
      return response.json();
    },
    enabled: !!orderToken,
  });

  // Mutation for ticket reassignment
  const reassignMutation = useMutation({
    mutationFn: async (data: ReassignData) => {
      if (!orderDetails?.ticket.id) throw new Error('No ticket ID');
      const response = await fetch(`/api/tickets/${orderDetails.ticket.id}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: orderToken, ...data }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reassign ticket');
      }
      return response.json();
    },
    onSuccess: () => {
      alert(
        '✓ Ticket reassigned successfully! The new owner will receive an email with their ticket details. You will no longer have access to this ticket.'
      );
      setShowReassignModal(false);
      setReassignData({ email: '', firstName: '', lastName: '' });
      setTimeout(() => router.push('/'), 2000);
    },
  });

  return (
    <Layout title="Manage Your Ticket | ZurichJS Conference 2026" description="View and manage your ZurichJS Conference 2026 ticket.">
      <PageHeader />
      <div className="min-h-screen bg-brand-primary py-16 md:py-24 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Loading State */}
          {(!router.isReady || isLoading) && <LoadingState />}

          {/* Error State */}
          {router.isReady && (!orderToken || error) && <ErrorState orderToken={orderToken} error={error} />}

          {/* Success State */}
          {router.isReady && !isLoading && !error && orderDetails && (
            <>
              <TicketHeader ticket={orderDetails.ticket} />

              {orderDetails.transferInfo && <TransferNotice transferInfo={orderDetails.transferInfo} />}

              <TicketQRCard qrCodeUrl={orderDetails.ticket.qr_code_url} />
              <TicketDetailsCard ticket={orderDetails.ticket} />
              <VipPerksCard isVip={orderDetails.ticket.ticket_category === 'vip'} />

              {orderDetails.pendingUpgrade && <PendingUpgradeCard upgrade={orderDetails.pendingUpgrade} />}

              {orderDetails.ticket.ticket_category !== 'vip' && !orderDetails.pendingUpgrade && (
                <UpgradeCta
                  ticketId={orderDetails.ticket.id}
                  firstName={orderDetails.ticket.first_name}
                  lastName={orderDetails.ticket.last_name}
                  email={orderDetails.ticket.email}
                />
              )}

              <EventInfoCard />
              <QuickActionsCard ticketId={orderDetails.ticket.id} />
              <TransferSection onTransferClick={() => setShowReassignModal(true)} />
              <ImportantInfoCard />

              <div className="flex justify-center">
                <Link href="/">
                  <Button variant="dark" size="lg">
                    Return to Homepage
                  </Button>
                </Link>
              </div>

              <SupportContact />

              <ReassignModal
                isOpen={showReassignModal}
                onClose={() => setShowReassignModal(false)}
                reassignData={reassignData}
                setReassignData={setReassignData}
                mutation={reassignMutation}
              />
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

function LoadingState() {
  return (
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      <p className="mt-4 text-black">Loading your ticket...</p>
    </div>
  );
}

function ErrorState({ orderToken, error }: { orderToken: string; error: Error | null }) {
  return (
    <div className="text-center">
      <div className="mb-8">
        <div className="text-6xl mb-4">🔒</div>
        <Kicker variant="light" className="mb-4">
          Access Denied
        </Kicker>
        <Heading level="h1" variant="light" className="mb-6 text-black">
          Unable to Access Ticket
        </Heading>
        <div className="max-w-xl mx-auto">
          <p className="text-lg text-black/80 mb-4">
            {!orderToken
              ? 'No access token found. Please use the link from your confirmation email.'
              : error instanceof Error
                ? error.message
                : 'An unexpected error occurred while loading your ticket.'}
          </p>
          <div className="bg-black rounded-2xl p-6 text-left mb-8">
            <h3 className="text-brand-primary font-semibold mb-3">What you can do:</h3>
            <ul className="text-gray-200 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-brand-primary mt-1">•</span>
                <span>Check your email for the ticket management link</span>
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
  );
}

function TicketHeader({ ticket }: { ticket: { first_name: string; last_name: string } }) {
  return (
    <div className="text-center mb-12">
      <div className="text-6xl mb-4">🎫</div>
      <Kicker variant="light" className="mb-4">
        Your Ticket
      </Kicker>
      <Heading level="h1" variant="light" className="mb-6 text-black">
        ZurichJS Conference 2026
      </Heading>
      <p className="text-lg text-black/80">
        Ticket for{' '}
        <strong className="text-black">
          {ticket.first_name} {ticket.last_name}
        </strong>
      </p>
    </div>
  );
}

function TransferNotice({
  transferInfo,
}: {
  transferInfo: { transferredFrom: string; transferredFromEmail: string; transferredAt: string };
}) {
  return (
    <div className="bg-blue-100 border-l-4 border-blue-500 rounded-lg p-6 mb-8">
      <div className="flex items-start gap-3">
        <span className="text-xl">↗️</span>
        <div>
          <h3 className="text-blue-900 font-semibold mb-2">Transferred Ticket</h3>
          <p className="text-blue-800 text-sm">
            This ticket was transferred to you by <strong>{transferInfo.transferredFrom}</strong> (
            {transferInfo.transferredFromEmail}) on {formatDate(transferInfo.transferredAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

function SupportContact() {
  return (
    <div className="mt-12 pt-8 border-t border-black/20 text-center">
      <p className="text-black/70">
        Need help? Contact us at{' '}
        <a href="mailto:hello@zurichjs.com" className="text-black hover:underline font-bold transition-colors">
          hello@zurichjs.com
        </a>
      </p>
    </div>
  );
}

export default ManageOrderPage;
