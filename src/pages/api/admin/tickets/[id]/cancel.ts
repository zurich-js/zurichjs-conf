/**
 * Cancel Ticket API
 * POST /api/admin/tickets/[id]/cancel
 */

import { withApiHandler } from '@/lib/api/handler';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { ErrorCodes, HttpError, throwIfDbError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';

export default withApiHandler(
  { scope: 'Cancel Ticket API', methods: ['POST'] },
  async (req, res) => {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      throw new HttpError(401, 'Unauthorized', { code: ErrorCodes.AUTH_REQUIRED });
    }

    const { id } = req.query;
    if (typeof id !== 'string') {
      throw new HttpError(400, 'Invalid ticket ID');
    }

    const supabase = createServiceRoleClient();

    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !ticket) {
      throw new HttpError(404, 'Ticket not found', {
        code: ErrorCodes.NOT_FOUND,
        cause: error,
        context: { ticketId: id },
      });
    }

    if (ticket.status === 'cancelled') {
      throw new HttpError(400, 'Ticket already cancelled');
    }

    const { error: updateError } = await supabase
      .from('tickets')
      .update({ status: 'cancelled' })
      .eq('id', id);

    throwIfDbError(updateError, 'Failed to cancel ticket', {
      code: ErrorCodes.TICKET_CANCEL_DB_UPDATE_FAILED,
      context: { ticketId: id },
    });

    return res.status(200).json({
      success: true,
      message: 'Ticket cancelled successfully',
    });
  }
);
