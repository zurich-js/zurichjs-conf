/**
 * Manage Ticket Page
 * Allows attendees to view and manage their ticket using a secure token from email.
 *
 * Server-rendered: the token is verified and the order details are fetched in
 * getServerSideProps and hydrated into TanStack Query, so the first paint
 * already contains the ticket (or a real error state). This also keeps the
 * page meaningful in contexts where JavaScript never runs, e.g. sandboxed
 * email-client preview iframes that block script execution.
 */

import React from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient, dehydrate, type DehydratedState } from '@tanstack/react-query';
import { Ticket as TicketIcon, Lock, MailCheck, ArrowRightLeft } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Heading, Kicker, Button } from '@/components/atoms';
import { PageHeader } from '@/components/organisms';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';
import {
  SectionNav,
  MANAGE_ORDER_SECTIONS,
  TicketQRCard,
  TicketDetailsCard,
  NetworkingCard,
  VipPerksCard,
  PendingUpgradeCard,
  UpgradeCta,
  ReassignModal,
  ApparelPreferencesCard,
  EventInfoCard,
  QuickActionsCard,
  TransferSection,
  ImportantInfoCard,
  extractErrorMessage,
  formatDate,
  type ReassignData,
  type ApparelPreferencesData,
  type NetworkingPreferencesData,
  type OrderDetailsResponse,
} from '@/components/manage-order';
import type { AttendeeNetworkingProfile, NetworkingSettings } from '@/lib/types/networking';

type FetchError = Error & { status?: number };

/**
 * Outcome of the server-side token check:
 * - `ok`        — token verified, order details hydrated into the query cache
 * - `missing`   — no token in the URL
 * - `invalid`   — signature no longer verifies (predates a secret rotation)
 * - `not-found` — token verified but the ticket no longer exists
 * - `error`     — transient server-side failure; the client retries via the API
 */
type TokenStatus = 'ok' | 'missing' | 'invalid' | 'not-found' | 'error';

interface ManageOrderPageProps {
  token: string;
  tokenStatus: TokenStatus;
  dehydratedState?: DehydratedState;
}

const ManageOrderPage: React.FC<ManageOrderPageProps> = ({ token, tokenStatus }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showReassignModal, setShowReassignModal] = React.useState(false);
  const [reassignData, setReassignData] = React.useState<ReassignData>({ email: '', firstName: '', lastName: '' });

  // Fetch ticket details — hydrated from the server on first render, so this
  // only hits the API for refetches (e.g. after saving apparel preferences)
  // or as a recovery path when SSR failed transiently.
  const {
    data: orderDetails,
    isLoading,
    error,
  } = useQuery<OrderDetailsResponse, FetchError>({
    queryKey: ['order', token],
    queryFn: async () => {
      // The token comes from the URL — encode it so a crafted value can't
      // change the request path (flagged by CodeQL as request forgery)
      const response = await fetch(`/api/orders/${encodeURIComponent(token)}`);
      if (!response.ok) {
        const fetchError: FetchError = new Error(
          await extractErrorMessage(response, 'Failed to fetch ticket details')
        );
        fetchError.status = response.status;
        throw fetchError;
      }
      return response.json();
    },
    enabled: !!token && (tokenStatus === 'ok' || tokenStatus === 'error'),
  });

  // Mutation for requesting a freshly signed link when the token no longer verifies
  const recoverLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/orders/recover-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, 'Failed to request a new link'));
      }
      return response.json();
    },
  });

  // An invalid signature means the link predates a secret rotation —
  // automatically email a fresh ticket email so the visitor doesn't have to
  // figure out what went wrong. The server dedupes per ticket.
  const isInvalidToken = tokenStatus === 'invalid' || error?.status === 401;
  const { mutate: requestNewLink } = recoverLinkMutation;
  const autoRequestFired = React.useRef(false);
  React.useEffect(() => {
    if (isInvalidToken && token && !autoRequestFired.current) {
      autoRequestFired.current = true;
      requestNewLink();
    }
  }, [isInvalidToken, token, requestNewLink]);

  // Mutation for ticket reassignment
  const reassignMutation = useMutation({
    mutationFn: async (data: ReassignData) => {
      if (!orderDetails?.ticket.id) throw new Error('No ticket ID');
      const response = await fetch(`/api/tickets/${orderDetails.ticket.id}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...data }),
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, 'Failed to reassign ticket'));
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success(
        'Ticket transferred',
        'The new owner will receive an email with their ticket details. You no longer have access to this ticket.'
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
        body: JSON.stringify({ token, ...data }),
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, 'Failed to save apparel preferences'));
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', token] });
    },
  });

  const networkingMutation = useMutation<
    NetworkingSettings<AttendeeNetworkingProfile>,
    Error,
    NetworkingPreferencesData
  >({
    mutationFn: async (data) => {
      if (!orderDetails?.ticket.id) throw new Error('No ticket ID');
      const response = await fetch(`/api/tickets/${orderDetails.ticket.id}/networking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...data }),
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, 'Failed to save networking settings'));
      }
      return response.json() as Promise<NetworkingSettings<AttendeeNetworkingProfile>>;
    },
    onSuccess: (networking) => {
      queryClient.setQueryData<OrderDetailsResponse>(['order', token], (current) =>
        current ? { ...current, networking } : current
      );
    },
  });

  const showErrorState =
    tokenStatus === 'missing' || tokenStatus === 'not-found' || isInvalidToken || (!!error && !orderDetails);

  return (
    <Layout title="Manage Your Ticket | ZurichJS Conference 2026" description="View and manage your ZurichJS Conference 2026 ticket.">
      <PageHeader />
      <div className="min-h-screen bg-brand-white py-16 md:py-24 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Error State */}
          {showErrorState && (
            <ErrorState
              tokenStatus={tokenStatus}
              error={error ?? null}
              isInvalidToken={!!isInvalidToken}
              recoverLinkMutation={recoverLinkMutation}
            />
          )}

          {/* Loading State — only reachable when SSR failed transiently and the client is retrying */}
          {!showErrorState && isLoading && <LoadingState />}

          {/* Success State */}
          {!showErrorState && orderDetails && (
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
              <div id={MANAGE_ORDER_SECTIONS.networking} className="scroll-mt-28">
                <NetworkingCard settings={orderDetails.networking} mutation={networkingMutation} />
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

export const getServerSideProps: GetServerSideProps<ManageOrderPageProps> = async (ctx) => {
  ctx.res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  ctx.res.setHeader('Referrer-Policy', 'no-referrer');
  ctx.res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  // These imports are server-only; Next.js strips them from the client bundle
  const { verifyOrderTokenForCurrentTicket } = await import('@/lib/auth/orderTokenServer');
  const { getOrderDetails } = await import('@/lib/orders');
  const { getQueryClient } = await import('@/lib/query-client');
  const { logger } = await import('@/lib/logger');

  const token = typeof ctx.query.token === 'string' ? ctx.query.token : '';

  if (!token) {
    return { props: { token: '', tokenStatus: 'missing' } };
  }

  const ticketId = await verifyOrderTokenForCurrentTicket(token);
  if (!ticketId) {
    return { props: { token, tokenStatus: 'invalid' } };
  }

  try {
    // Cap the lookup so a hung DB connection can't stall SSR indefinitely —
    // on timeout the page falls back to client-side fetching via the API
    const details = await Promise.race([
      getOrderDetails(ticketId),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Order details lookup timed out after 3000ms')), 3000);
      }),
    ]);

    if (!details) {
      return { props: { token, tokenStatus: 'not-found' } };
    }

    const queryClient = getQueryClient();
    queryClient.setQueryData(['order', token], details);

    return {
      props: {
        token,
        tokenStatus: 'ok',
        dehydratedState: dehydrate(queryClient),
      },
    };
  } catch (err) {
    logger.scope('Manage Order Page').error('SSR order details fetch failed', err, { ticketId });
    return { props: { token, tokenStatus: 'error' } };
  }
};

function LoadingState() {
  return (
    <div className="text-center" role="status">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      <p className="mt-4 text-black">Loading your ticket...</p>
    </div>
  );
}

interface ErrorStateProps {
  tokenStatus: TokenStatus;
  error: FetchError | null;
  isInvalidToken: boolean;
  recoverLinkMutation: {
    mutate: () => void;
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
    error: Error | null;
  };
}

function ErrorState({ tokenStatus, error, isInvalidToken, recoverLinkMutation }: ErrorStateProps) {
  const hasToken = tokenStatus !== 'missing';

  // A stale-but-well-formed link triggers an automatic resend of the ticket
  // email — present that as the main event, not as an access failure
  if (hasToken && isInvalidToken && !recoverLinkMutation.isError) {
    return (
      <div className="text-center">
        <div className="mb-8">
          <MailCheck className="w-14 h-14 mx-auto mb-4 text-black" aria-hidden="true" />
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

  const errorMessage = !hasToken
    ? 'No access token found. Please use the link from your confirmation email.'
    : tokenStatus === 'not-found'
      ? 'We could not find a ticket for this link. It may have been transferred or refunded.'
      : error
        ? error.message
        : 'An unexpected error occurred while loading your ticket.';

  return (
    <div className="text-center">
      <div className="mb-8">
        <Lock className="w-14 h-14 mx-auto mb-4 text-black" aria-hidden="true" />
        <Kicker variant="light" className="mb-4">
          Access Denied
        </Kicker>
        <Heading level="h1" variant="light" className="mb-6 text-black">
          Unable to Access Ticket
        </Heading>
        <div className="max-w-xl mx-auto">
          <p className="text-lg text-black/80 mb-4">{errorMessage}</p>
          <div className="rounded-2xl border border-brand-gray-light bg-brand-gray-lightest p-6 text-left mb-8">
            <h3 className="text-brand-black font-semibold mb-3">What you can do:</h3>
            <ul className="text-brand-gray-darkest space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-brand-blue mt-1">•</span>
                <span>Check your email for the ticket management link</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-blue mt-1">•</span>
                <span>Make sure you&apos;re using the complete link from the email</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-blue mt-1">•</span>
                <span>Contact us at hello@zurichjs.com if you need assistance</span>
              </li>
            </ul>
          </div>
          {hasToken && (
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
      <TicketIcon className="w-14 h-14 mx-auto mb-4 text-black" aria-hidden="true" />
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
        <ArrowRightLeft className="w-5 h-5 text-blue-700 mt-1" aria-hidden="true" />
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
