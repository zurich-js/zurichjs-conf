/**
 * CFP Submissions API
 * GET /api/cfp/submissions - List speaker's submissions
 * POST /api/cfp/submissions - Create new submission
 */

import { withApiHandler } from '@/lib/api/handler';
import { serverAnalytics } from '@/lib/analytics/server';
import { createSupabaseApiClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { CFP_CLOSED_ERROR_CODE, isCfpClosed } from '@/lib/cfp/closure';
import { SUBMISSION_LIMITS } from '@/lib/cfp/config';
import { getSubmissionsBySpeakerId, createSubmission, getSubmissionCount } from '@/lib/cfp/submissions';
import { ErrorCodes, HttpError } from '@/lib/errors';
import { submissionSchema } from '@/lib/validations/cfp';

export default withApiHandler(
  { scope: 'CFP Submissions API', methods: ['GET', 'POST'] },
  async (req, res, { requestId, log }) => {
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
      const { submissions, error } = await getSubmissionsBySpeakerId(speaker.id);
      if (error) {
        return res.status(500).json({ error, code: ErrorCodes.INTERNAL, requestId });
      }
      return res.status(200).json({ submissions });
    }

    // POST
    if (isCfpClosed()) {
      // Clients branch on `code === CFP_CLOSED_ERROR_CODE` — keep this body
      // hand-rolled so the shape stays byte-identical (plus requestId).
      return res.status(403).json({
        code: CFP_CLOSED_ERROR_CODE,
        error: 'CFP is closed. New submissions are no longer accepted.',
        requestId,
      });
    }

    // Check submission limit
    const count = await getSubmissionCount(speaker.id);
    if (count >= SUBMISSION_LIMITS.MAX_ACTIVE_SUBMISSIONS) {
      throw new HttpError(
        400,
        `Maximum ${SUBMISSION_LIMITS.MAX_ACTIVE_SUBMISSIONS} submissions allowed`
      );
    }

    // Validate input (POST only, so not the wrapper's bodySchema)
    const result = submissionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        code: ErrorCodes.VALIDATION_FAILED,
        issues: result.error.issues,
        requestId,
      });
    }

    // Create submission
    const { submission, error } = await createSubmission(speaker.id, result.data);

    if (error || !submission) {
      log.error('Failed to create submission', error, { speakerId: speaker.id });
      return res.status(500).json({
        error: error || 'Failed to create submission',
        code: ErrorCodes.INTERNAL,
        requestId,
      });
    }

    // Track submission creation
    await serverAnalytics.track('cfp_submission_created', speaker.id, {
      submission_id: submission.id,
      submission_type: result.data.submission_type,
      submission_level: result.data.talk_level,
      speaker_id: speaker.id,
    });

    log.info('Submission created', {
      submissionId: submission.id,
      speakerId: speaker.id,
      type: result.data.submission_type,
    });

    return res.status(201).json({ submission });
  }
);
