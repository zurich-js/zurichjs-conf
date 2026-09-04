/**
 * Order Details
 * Shared lookup used by GET /api/orders/[token] and the manage-order page's
 * getServerSideProps, so SSR reads Supabase directly instead of hopping
 * through its own API route.
 */

import { extractTicketIdUnverified } from '@/lib/auth/orderToken';
import { ORDER_TOKEN_TICKET_COLUMNS, resolveOrderTokenAccess } from '@/lib/auth/orderTokenServer';
import { createServiceRoleClient } from '@/lib/supabase';
import type { Ticket } from '@/lib/types/database';
import type { AttendeeNetworkingProfile, NetworkingSettings } from '@/lib/types/networking';
import type { TicketUpgrade } from '@/lib/types/ticket-upgrade';
import { attendeeNetworkingProfileSchema } from '@/lib/validations/networking';
import { logger } from '@/lib/logger';

const log = logger.scope('Order Details');

/**
 * Ticket columns the manage-order response is built from. Deliberately narrow:
 * everything selected here is serialized to the browser.
 */
const MANAGE_ORDER_TICKET_COLUMNS =
  'id, first_name, last_name, email, company, job_title, ticket_category, ticket_stage, amount_paid, currency, status, qr_code_url, transferred_from_name, transferred_from_email, transferred_at, created_at' as const;

/** The same columns plus the ones the token check needs, for a single read. */
const MANAGE_ORDER_TICKET_COLUMNS_WITH_ACCESS =
  `${ORDER_TOKEN_TICKET_COLUMNS}, ${MANAGE_ORDER_TICKET_COLUMNS}` as const;

export type ManageOrderTicket = Pick<
  Ticket,
  | 'id'
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'company'
  | 'job_title'
  | 'ticket_category'
  | 'ticket_stage'
  | 'amount_paid'
  | 'currency'
  | 'status'
  | 'qr_code_url'
  | 'transferred_from_name'
  | 'transferred_from_email'
  | 'transferred_at'
  | 'created_at'
>;

export interface OrderDetailsResponse {
  ticket: ManageOrderTicket;
  transferInfo?: {
    transferredFrom: string;
    transferredFromEmail: string;
    transferredAt: string;
  };
  pendingUpgrade?: {
    id: string;
    status: TicketUpgrade['status'];
    upgradeMode: TicketUpgrade['upgrade_mode'];
    amount: number | null;
    currency: string | null;
    stripePaymentLinkUrl: string | null;
    bankTransferReference: string | null;
    bankTransferDueDate: string | null;
    createdAt: string;
  };
  apparelPreferences?: {
    tshirtSize: string | null;
    hoodieSize: string | null;
  };
  networking?: NetworkingSettings<AttendeeNetworkingProfile>;
  /** Workshop discount voucher — present only for VIP tickets with an issued, active voucher */
  vipPerk?: {
    code: string;
    discountPercent: number;
    expiresAt: string | null;
    isRedeemed: boolean;
  };
}

export interface GetOrderDetailsOptions {
  /**
   * Cancels the in-flight Supabase requests once the caller's budget expires,
   * so abandoned work stops instead of running on against a struggling
   * database. Note that an aborted PostgREST query resolves with an error
   * rather than rejecting — check `signal.aborted` to tell the two apart.
   */
  signal?: AbortSignal;
  /**
   * Ticket row the caller already holds. `getOrderDetailsForToken` reads it as
   * part of the access check, so passing it here saves re-reading `tickets`.
   */
  ticket?: ManageOrderTicket;
}

/**
 * Fetch everything the manage-order page needs for a ticket.
 *
 * All queries key off the ticket ID alone, so they run in a single
 * parallel round trip (the vip_perks lookup runs for every ticket and is
 * simply discarded for non-VIPs — cheaper than serializing on the ticket row).
 *
 * Returns null when the ticket doesn't exist.
 */
export async function getOrderDetails(
  ticketId: string,
  options: GetOrderDetailsOptions = {}
): Promise<OrderDetailsResponse | null> {
  const supabase = createServiceRoleClient();
  const prefetchedTicket = options.ticket;
  // A controller that is never aborted stands in for "no budget", so every
  // query can be built the same way.
  const signal = options.signal ?? new AbortController().signal;

  // Every query has to be handed to Promise.all together: a PostgREST builder
  // is lazy, and only starts its request once it is awaited.
  const [ticketResult, pendingUpgradeResult, vipPerkResult, apparelResult, networkingResult] = await Promise.all([
    prefetchedTicket
      ? Promise.resolve(null)
      : supabase
          .from('tickets')
          .select(MANAGE_ORDER_TICKET_COLUMNS)
          .eq('id', ticketId)
          .abortSignal(signal)
          .single(),
    supabase
      .from('ticket_upgrades')
      .select('*')
      .eq('ticket_id', ticketId)
      .in('status', ['pending_payment', 'pending_bank_transfer'])
      .order('created_at', { ascending: false })
      .limit(1)
      .abortSignal(signal)
      .maybeSingle(),
    supabase
      .from('vip_perks')
      .select('code, discount_percent, expires_at, max_redemptions, current_redemptions')
      .eq('ticket_id', ticketId)
      .eq('is_active', true)
      .abortSignal(signal)
      .maybeSingle(),
    supabase
      .from('ticket_apparel_preferences')
      .select('tshirt_size, hoodie_size')
      .eq('ticket_id', ticketId)
      .abortSignal(signal)
      .maybeSingle(),
    supabase
      .from('networking_profiles')
      .select('share_id, enabled, profile')
      .eq('ticket_id', ticketId)
      .eq('subject_type', 'attendee')
      .abortSignal(signal)
      .maybeSingle(),
  ]);

  const ticket = prefetchedTicket ?? (ticketResult?.data as ManageOrderTicket | null | undefined);

  if (!ticket) {
    log.error('Error fetching ticket', ticketResult?.error ?? undefined, { ticketId });
    return null;
  }

  const response: OrderDetailsResponse = { ticket };

  if (ticket.transferred_from_name && ticket.transferred_from_email && ticket.transferred_at) {
    response.transferInfo = {
      transferredFrom: ticket.transferred_from_name,
      transferredFromEmail: ticket.transferred_from_email,
      transferredAt: ticket.transferred_at,
    };
  }

  const pendingUpgrade = pendingUpgradeResult.data;
  if (pendingUpgrade) {
    response.pendingUpgrade = {
      id: pendingUpgrade.id,
      status: pendingUpgrade.status as 'pending_payment' | 'pending_bank_transfer',
      upgradeMode: pendingUpgrade.upgrade_mode as 'complimentary' | 'bank_transfer' | 'stripe',
      amount: pendingUpgrade.amount,
      currency: pendingUpgrade.currency,
      stripePaymentLinkUrl: pendingUpgrade.stripe_payment_link_url,
      bankTransferReference: pendingUpgrade.bank_transfer_reference,
      bankTransferDueDate: pendingUpgrade.bank_transfer_due_date,
      createdAt: pendingUpgrade.created_at,
    };
  }

  if (ticket.ticket_category === 'vip') {
    if (vipPerkResult.error) {
      // Non-fatal — the page still works without the voucher block
      log.error('Error fetching VIP perk for order', vipPerkResult.error, { ticketId });
    } else if (vipPerkResult.data) {
      const vipPerk = vipPerkResult.data;
      response.vipPerk = {
        code: vipPerk.code,
        discountPercent: vipPerk.discount_percent,
        expiresAt: vipPerk.expires_at,
        isRedeemed: vipPerk.max_redemptions != null && vipPerk.current_redemptions >= vipPerk.max_redemptions,
      };
    }
  }

  if (apparelResult.data) {
    response.apparelPreferences = {
      tshirtSize: apparelResult.data.tshirt_size,
      hoodieSize: apparelResult.data.hoodie_size,
    };
  }

  if (networkingResult.error) {
    log.warn('Error fetching attendee networking profile', {
      ticketId,
      error: networkingResult.error,
    });
  } else if (networkingResult.data) {
    const profileResult = attendeeNetworkingProfileSchema.safeParse(networkingResult.data.profile);

    if (profileResult.success) {
      response.networking = {
        shareId: networkingResult.data.share_id,
        enabled: networkingResult.data.enabled,
        profile: profileResult.data,
      };
    } else {
      log.warn('Ignoring invalid attendee networking profile', { ticketId });
    }
  }

  return response;
}

/**
 * Outcome of a token-scoped order lookup.
 *
 * `unauthorized` covers a signature that no longer verifies and a ticket that
 * no longer exists — without the ticket's nonce there is no way to tell a
 * stale link from a forged one, and both should land on the same recovery
 * flow. `timed-out` and `error` are transient: the caller can degrade to a
 * client-side retry.
 */
export type OrderLookupResult =
  | { status: 'ok'; ticketId: string; details: OrderDetailsResponse }
  | { status: 'unauthorized' }
  | { status: 'timed-out' }
  | { status: 'error' };

export interface GetOrderDetailsForTokenOptions {
  /**
   * Budget for the whole lookup — access check and details together. Omit for
   * no budget. On expiry the in-flight queries are cancelled rather than left
   * running, so a timeout sheds load instead of adding to it.
   */
  timeoutMs?: number;
}

/**
 * Verify a manage-order token and load the order in one pass.
 *
 * The access check and the response are built from a single read of `tickets`
 * — the token gate needs the nonce, the page needs the rest of the row, and
 * splitting them cost an extra round trip on every request.
 */
export async function getOrderDetailsForToken(
  token: string,
  options: GetOrderDetailsForTokenOptions = {}
): Promise<OrderLookupResult> {
  const ticketId = extractTicketIdUnverified(token);
  if (!ticketId) {
    return { status: 'unauthorized' };
  }

  const controller = new AbortController();
  const timer =
    options.timeoutMs === undefined ? undefined : setTimeout(() => controller.abort(), options.timeoutMs);
  const { signal } = controller;

  try {
    const supabase = createServiceRoleClient();

    const { data: row, error } = await supabase
      .from('tickets')
      .select(MANAGE_ORDER_TICKET_COLUMNS_WITH_ACCESS)
      .eq('id', ticketId)
      .abortSignal(signal)
      .maybeSingle();

    // An aborted query resolves with an error rather than rejecting, so the
    // budget has to be checked before the error is interpreted.
    if (signal.aborted) return { status: 'timed-out' };

    if (error) {
      log.error('Failed to fetch ticket for order lookup', error, { ticketId });
      return { status: 'error' };
    }

    if (!row) return { status: 'unauthorized' };

    // Strip the access columns here so they cannot reach the response, which
    // is serialized to the browser.
    const { manage_token_nonce, legacy_manage_token_valid, ...ticketColumns } = row;
    const ticket = ticketColumns as ManageOrderTicket;

    const access = resolveOrderTokenAccess(token, { manage_token_nonce, legacy_manage_token_valid });
    if (!access) return { status: 'unauthorized' };

    const details = await getOrderDetails(access.ticketId, { signal, ticket });

    if (signal.aborted) return { status: 'timed-out' };
    if (!details) return { status: 'error' };

    return { status: 'ok', ticketId: access.ticketId, details };
  } catch (err) {
    log.error('Order lookup failed', err, { ticketId });
    return { status: 'error' };
  } finally {
    // Never leave the budget timer pending — it would hold the event loop open
    // for the rest of its delay on every fast request.
    clearTimeout(timer);
  }
}
