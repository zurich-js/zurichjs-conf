import { extractTicketIdUnverified, verifyOrderToken } from '@/lib/auth/orderToken';
import { logger } from '@/lib/logger';
import { createServiceRoleClient } from '@/lib/supabase';

const log = logger.scope('Order Token');

/**
 * Verify an order token against the ticket's current management nonce.
 *
 * The unverified UUID is used only for this narrow lookup. Access is granted
 * only after the fetched nonce validates the token signature.
 */
export async function verifyOrderTokenForCurrentTicket(token: string): Promise<string | null> {
  const ticketId = extractTicketIdUnverified(token);
  if (!ticketId) {
    return null;
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('manage_token_nonce')
      .eq('id', ticketId)
      .maybeSingle();

    if (error) {
      log.error('Failed to fetch ticket while verifying order token', error, { ticketId });
      return null;
    }

    return ticket ? verifyOrderToken(token, ticket.manage_token_nonce) : null;
  } catch (error) {
    log.error('Error verifying order token against current ticket', error, { ticketId });
    return null;
  }
}
