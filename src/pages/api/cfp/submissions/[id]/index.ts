/**
 * CFP Submission Detail API
 * GET /api/cfp/submissions/[id] - Get submission details
 * PUT /api/cfp/submissions/[id] - Update submission (draft only)
 * DELETE /api/cfp/submissions/[id] - Delete submission (draft only)
 */

import { withApiHandler } from '@/lib/api/handler';
import { createSupabaseApiClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { CFP_CLOSED_ERROR_CODE, isCfpClosed } from '@/lib/cfp/closure';
import {
  getSubmissionWithDetails,
  updateSubmission,
  deleteSubmission,
} from '@/lib/cfp/submissions';
import { ErrorCodes, HttpError } from '@/lib/errors';
import { updateSubmissionSchema } from '@/lib/validations/cfp';

export default withApiHandler(
  { scope: 'CFP Submission API', methods: ['GET', 'PUT', 'DELETE'] },
  async (req, res, { requestId, log }) => {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      throw new HttpError(400, 'Invalid submission ID');
    }

    // Get session
    const supabase = createSupabaseApiClient(req, res);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new HttpError(401, 'Unauthorized', { code: ErrorCodes.AUTH_REQUIRED });
    }

    // Get speaker
    const speaker = await getSpeakerByUserId(session.user.id);
    if (!speaker) {
      throw new HttpError(404, 'Speaker profile not found', { code: ErrorCodes.NOT_FOUND });
    }

    if (req.method === 'GET') {
      const submission = await getSubmissionWithDetails(id);

      if (!submission) {
        throw new HttpError(404, 'Submission not found', { code: ErrorCodes.NOT_FOUND });
      }

      // Verify ownership
      if (submission.speaker_id !== speaker.id) {
        throw new HttpError(403, 'Access denied', { code: ErrorCodes.AUTH_FORBIDDEN });
      }

      return res.status(200).json({ submission });
    }

    if (req.method === 'PUT') {
      const existingSubmission = await getSubmissionWithDetails(id);
      if (!existingSubmission) {
        throw new HttpError(404, 'Submission not found', { code: ErrorCodes.NOT_FOUND });
      }
      if (existingSubmission.speaker_id !== speaker.id) {
        throw new HttpError(403, 'Access denied', { code: ErrorCodes.AUTH_FORBIDDEN });
      }
      if (isCfpClosed()) {
        // Clients branch on `code === CFP_CLOSED_ERROR_CODE` — keep this body
        // hand-rolled so the shape stays byte-identical (plus requestId).
        return res.status(403).json({
          code: CFP_CLOSED_ERROR_CODE,
          error: 'CFP is closed. Draft editing is disabled.',
          requestId,
        });
      }

      // Validate input (PUT only, so not the wrapper's bodySchema)
      const result = updateSubmissionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: 'Validation failed',
          code: ErrorCodes.VALIDATION_FAILED,
          issues: result.error.issues,
          requestId,
        });
      }

      const { submission, error } = await updateSubmission(id, speaker.id, result.data);

      if (error) {
        throw new HttpError(400, error);
      }

      if (!submission) {
        throw new HttpError(404, 'Submission not found', { code: ErrorCodes.NOT_FOUND });
      }

      log.info('Submission updated', { submissionId: id, speakerId: speaker.id });
      return res.status(200).json({ submission });
    }

    // DELETE
    const existingSubmission = await getSubmissionWithDetails(id);
    if (!existingSubmission) {
      throw new HttpError(404, 'Submission not found', { code: ErrorCodes.NOT_FOUND });
    }
    if (existingSubmission.speaker_id !== speaker.id) {
      throw new HttpError(403, 'Access denied', { code: ErrorCodes.AUTH_FORBIDDEN });
    }
    if (isCfpClosed()) {
      return res.status(403).json({
        code: CFP_CLOSED_ERROR_CODE,
        error: 'CFP is closed. Draft deletion is disabled.',
        requestId,
      });
    }

    const { success, error } = await deleteSubmission(id, speaker.id);

    if (!success) {
      throw new HttpError(400, error || 'Failed to delete submission');
    }

    log.info('Submission deleted', { submissionId: id, speakerId: speaker.id });
    return res.status(200).json({ success: true });
  }
);
