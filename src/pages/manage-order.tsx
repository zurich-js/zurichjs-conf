/**
 * Manage Ticket Page
 * Allows attendees to view and manage their ticket using a secure token from email
 */

import React from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Heading, Kicker, Button } from '@/components/atoms';
import { PageHeader } from '@/components/organisms';
import Link from 'next/link';
import {
  SectionNav,
  MANAGE_ORDER_SECTIONS,
  TicketQRCard,
  TicketDetailsCard,
  VipPerksCard,
  PendingUpgradeCard,
  UpgradeCta,
  ReassignModal,
  ApparelPreferencesCard,
  EventInfoCard,
  QuickActionsCard,
  TransferSection,
  ImportantInfoCard,
  formatDate,
  type ReassignData,
  type ApparelPreferencesData,
  type OrderDetailsResponse,
} from '@/components/manage-order';

type FetchError = Error & { status?: number };

const ManageOrderPage: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token } = router.query;
  const [showReassignModal, setShowReassignModal] = React.useState(false);
  const [reassignData, setReassignData] = React.useState<ReassignData>({ email: '', firstName: '', lastName: '' });

  const orderToken = router.isReady && typeof token === 'string' ? token : '';

  // Fetch ticket details
  const {
    data: orderDetails,
    isLoading,
    error,
  } = useQuery<OrderDetailsResponse, FetchError>({
    queryKey: ['order', orderToken],
    queryFn: async () => {
      if (!orderToken) throw new Error('No token provided');
      const response = await fetch(`/api/orders/${orderToken}`);
      if (!response.ok) {
        const errorData = await response.json();
        const fetchError: FetchError = new Error(errorData.error || 'Failed to fetch ticket details');
        fetchError.status = response.status;
        throw fetchError;
      }
      return response.json();
    },
    enabled: !!orderToken,
  });

  // Mutation for requesting a freshly signed link when the token no longer verifies
  const recoverLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/orders/recover-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: orderToken }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to request a new link');
      }
      return response.json();
    },
  });

  // A 401 means the link's signature no longer verifies (e.g. it predates a
  // secret rotation) — automatically email a fresh ticket email so the visitor
  // doesn't have to figure out what went wrong. The server dedupes per ticket.
  const isInvalidToken = error?.status === 401;
  const { mutate: requestNewLink } = recoverLinkMutation;
  const autoRequestFired = React.useRef(false);
  React.useEffect(() => {
    if (isInvalidToken && orderToken && !autoRequestFired.current) {
      autoRequestFired.current = true;
      requestNewLink();
    }
  }, [isInvalidToken, orderToken, requestNewLink]);

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

  // Mutation for apparel size preferences
  const apparelMutation = useMutation({
    mutationFn: async (data: ApparelPreferencesData) => {
      if (!orderDetails?.ticket.id) throw new Error('No ticket ID');
      const response = await fetch(`/api/tickets/${orderDetails.ticket.id}/apparel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: orderToken, ...data }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save apparel preferences');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderToken] });
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
          {router.isReady && (!orderToken || error) && (
            <ErrorState
              orderToken={orderToken}
              error={error}
              isInvalidToken={!!isInvalidToken}
              recoverLinkMutation={recoverLinkMutation}
            />
          )}

          {/* Success State */}
          {router.isReady && !isLoading && !error && orderDetails && (
            <>
              <TicketHeader ticket={orderDetails.ticket} />

              {orderDetails.transferInfo && <TransferNotice transferInfo={orderDetails.transferInfo} />}

              <SectionNav
                isVip={orderDetails.ticket.ticket_category === 'vip'}
                hasPendingUpgrade={!!orderDetails.pendingUpgrade}
              />

              <div id={MANAGE_ORDER_SECTIONS.entryPass} className="scroll-mt-28">
                <TicketQRCard qrCodeUrl={orderDetails.ticket.qr_code_url} />
              </div>
              <div id={MANAGE_ORDER_SECTIONS.ticketDetails} className="scroll-mt-28">
                <TicketDetailsCard ticket={orderDetails.ticket} />
              </div>
              {orderDetails.ticket.ticket_category === 'vip' && (
                <div id={MANAGE_ORDER_SECTIONS.vipBenefits} className="scroll-mt-28">
                  <VipPerksCard isVip vipPerk={orderDetails.vipPerk} />
                </div>
              )}
              <div id={MANAGE_ORDER_SECTIONS.apparel} className="scroll-mt-28">
                <ApparelPreferencesCard
                  isVip={orderDetails.ticket.ticket_category === 'vip'}
                  preferences={orderDetails.apparelPreferences}
                  mutation={apparelMutation}
                />
              </div>

              {orderDetails.pendingUpgrade && (
                <div id={MANAGE_ORDER_SECTIONS.vipUpgrade} className="scroll-mt-28">
                  <PendingUpgradeCard upgrade={orderDetails.pendingUpgrade} />
                </div>
              )}

              {orderDetails.ticket.ticket_category !== 'vip' && !orderDetails.pendingUpgrade && (
                <div id={MANAGE_ORDER_SECTIONS.vipUpgrade} className="scroll-mt-28">
                  <UpgradeCta
                    ticketId={orderDetails.ticket.id}
                    firstName={orderDetails.ticket.first_name}
                    lastName={orderDetails.ticket.last_name}
                    email={orderDetails.ticket.email}
                  />
                </div>
              )}

              <div id={MANAGE_ORDER_SECTIONS.eventInfo} className="scroll-mt-28">
                <EventInfoCard />
              </div>
              <div id={MANAGE_ORDER_SECTIONS.quickActions} className="scroll-mt-28">
                <QuickActionsCard ticketId={orderDetails.ticket.id} />
              </div>
              <div id={MANAGE_ORDER_SECTIONS.transfer} className="scroll-mt-28">
                <TransferSection onTransferClick={() => setShowReassignModal(true)} />
              </div>
              <div id={MANAGE_ORDER_SECTIONS.importantInfo} className="scroll-mt-28">
                <ImportantInfoCard />
              </div>

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

interface ErrorStateProps {
  orderToken: string;
  error: Error | null;
  isInvalidToken: boolean;
  recoverLinkMutation: {
    mutate: () => void;
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
    error: Error | null;
  };
}

function ErrorState({ orderToken, error, isInvalidToken, recoverLinkMutation }: ErrorStateProps) {
  // A stale-but-well-formed link triggers an automatic resend of the ticket
  // email — present that as the main event, not as an access failure
  if (orderToken && isInvalidToken && !recoverLinkMutation.isError) {
    return (
      <div className="text-center">
        <div className="mb-8">
          <div className="text-6xl mb-4">📮</div>
          <Kicker variant="light" className="mb-4">
            Link Update
          </Kicker>
          <Heading level="h1" variant="light" className="mb-6 text-black">
            {recoverLinkMutation.isSuccess ? 'Check Your Inbox' : 'Updating Your Link…'}
          </Heading>
          <div className="max-w-xl mx-auto">
            {recoverLinkMutation.isSuccess ? (
              <p className="text-lg text-black/80 mb-4" role="status">
                To keep your ticket secure, we validate every manage-order link — and this one is out of date. We&apos;ve
                sent a fresh ticket email to the address on file with your QR code and a new manage-order link. Open
                that email and click <strong className="text-black">Manage Order</strong> again to view or change your
                details.
              </p>
            ) : (
              <p className="text-lg text-black/80 mb-4" role="status">
                To keep your ticket secure, we validate every manage-order link — and this one is out of date.
                We&apos;re emailing you a fresh one right now…
              </p>
            )}
            <p className="text-black/70 mb-8">
              Nothing arrived after a few minutes? Check your spam folder or contact us at{' '}
              <a href="mailto:hello@zurichjs.com" className="text-black hover:underline font-bold">
                hello@zurichjs.com
              </a>
              .
            </p>
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
          {orderToken && (
            <div className="mb-8">
              <Button
                variant="dark"
                size="lg"
                onClick={() => recoverLinkMutation.mutate()}
                disabled={recoverLinkMutation.isPending}
              >
                {recoverLinkMutation.isPending ? 'Sending…' : 'Email Me a New Ticket Email'}
              </Button>
              {recoverLinkMutation.isError && (
                <p className="text-red-700 mt-3" role="alert">
                  {recoverLinkMutation.error instanceof Error
                    ? recoverLinkMutation.error.message
                    : 'Something went wrong. Please try again.'}
                </p>
              )}
            </div>
          )}
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
