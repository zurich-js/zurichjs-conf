/**
 * Cancel Workshop Registration API
 * POST /api/admin/workshops/[id]/registrants/[registrationId]/cancel
 */

import { withApiHandler } from '@/lib/api/handler';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { ErrorCodes, HttpError, throwIfDbError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';

export default withApiHandler(
  { scope: 'Cancel Workshop Registration API', methods: ['POST'] },
  async (req, res) => {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      throw new HttpError(401, 'Unauthorized', { code: ErrorCodes.AUTH_REQUIRED });
    }

    const { id, registrationId } = req.query;
    if (typeof id !== 'string' || typeof registrationId !== 'string') {
      throw new HttpError(400, 'Invalid IDs');
    }

    const supabase = createServiceRoleClient();

    const { data: registration, error } = await supabase
      .from('workshop_registrations')
      .select('*')
      .eq('id', registrationId)
      .eq('workshop_id', id)
      .single();

    if (error || !registration) {
      throw new HttpError(404, 'Registration not found', {
        code: ErrorCodes.NOT_FOUND,
        cause: error,
        context: { workshopId: id, registrationId },
      });
    }

    if (registration.status === 'cancelled' || registration.status === 'refunded') {
      throw new HttpError(
        400,
        registration.status === 'cancelled'
          ? 'Registration already cancelled'
          : 'Refunded registrations cannot be cancelled'
      );
    }

    const { error: updateError } = await supabase
      .from('workshop_registrations')
      .update({ status: 'cancelled' })
      .eq('id', registrationId);

    throwIfDbError(updateError, 'Failed to cancel workshop registration', {
      context: { workshopId: id, registrationId },
    });

    // enrolled_count is maintained atomically by sync_workshop_enrolled_count_trigger.

    return res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully',
    });
  }
);
