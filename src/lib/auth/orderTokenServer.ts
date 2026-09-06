import {
  extractTicketIdUnverified,
  verifyLegacyOrderToken,
  verifyOrderToken,
  type VerifiedOrderToken,
} from '@/lib/auth/orderToken';
import { logger } from '@/lib/logger';
import { createServiceRoleClient } from '@/lib/supabase';

const log = logger.scope('Order Token');

/** Ticket columns the access check reads. */
export const ORDER_TOKEN_TICKET_COLUMNS = 'manage_token_nonce, legacy_manage_token_valid' as const;

/** The access state a token is checked against, as stored on the ticket row. */
export interface OrderTokenTicketState {
  manage_token_nonce: string;
  legacy_manage_token_valid: boolean;
}

/**
 * Decide whether a token grants access, given the ticket's current access state.
 *
 * Split out from the fetch so a caller that already has the ticket row — the
 * manage-order lookup reads it in the same query it needs for the response —
 * can reuse the exact same gate rather than restating it.
 */
export function resolveOrderTokenAccess(
  token: string,
  ticket: OrderTokenTicketState
): VerifiedOrderToken | null {
  const currentTicketId = verifyOrderToken(token, ticket.manage_token_nonce);
  if (currentTicketId) {
    return { ticketId: currentTicketId, manageTokenNonce: ticket.manage_token_nonce };
  }

  const legacyTicketId = ticket.legacy_manage_token_valid
    ? verifyLegacyOrderToken(token)
    : null;
  // Legacy tokens carry no nonce. This is the current stored value, not an
  // authenticated token claim; callers may use it only as a current-row
  // concurrency check after this legacy access gate succeeds.
  return legacyTicketId
    ? { ticketId: legacyTicketId, manageTokenNonce: ticket.manage_token_nonce }
    : null;
}

/**
 * Verify an order token against the ticket's current access state.
 *
 * The unverified UUID is used only for this narrow lookup. Access is granted
 * only after validating either the current nonce-bound signature or, for
 * unmoved pre-migration tickets, its explicitly gated legacy signature.
 */
export async function verifyOrderTokenClaimsForCurrentTicket(
  token: string
): Promise<VerifiedOrderToken | null> {
  const ticketId = extractTicketIdUnverified(token);
  if (!ticketId) {
    return null;
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(ORDER_TOKEN_TICKET_COLUMNS)
      .eq('id', ticketId)
      .maybeSingle();

    if (error) {
      log.error('Failed to fetch ticket while verifying order token', error, { ticketId });
      return null;
    }

    if (!ticket) return null;

    return resolveOrderTokenAccess(token, ticket);
  } catch (error) {
    log.error('Error verifying order token against current ticket', error, { ticketId });
    return null;
  }
}

export async function verifyOrderTokenForCurrentTicket(token: string): Promise<string | null> {
  const claims = await verifyOrderTokenClaimsForCurrentTicket(token);
  return claims?.ticketId ?? null;
}
