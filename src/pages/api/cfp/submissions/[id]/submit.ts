/**
 * Submit Submission API
 * POST /api/cfp/submissions/[id]/submit - Submit a draft for review
 */

import { withApiHandler } from '@/lib/api/handler';
import { serverAnalytics } from '@/lib/analytics/server';
import { createSupabaseApiClient, getSpeakerByUserId, isSpeakerProfileComplete } from '@/lib/cfp/auth';
import { CFP_CLOSED_ERROR_CODE, isCfpClosed } from '@/lib/cfp/closure';
import { submitForReview, getSubmissionById } from '@/lib/cfp/submissions';
import { ErrorCodes, HttpError } from '@/lib/errors';
import { notifyCfpTalkSubmitted } from '@/lib/platform-notifications';

export default withApiHandler(
  { scope: 'CFP Submit API', methods: ['POST'] },
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

    // Check if profile is complete
    if (!isSpeakerProfileComplete(speaker)) {
      throw new HttpError(400, 'Please complete your profile before submitting');
    }

    // Verify submission exists and belongs to speaker
    const submission = await getSubmissionById(id);
    if (!submission) {
      throw new HttpError(404, 'Submission not found', { code: ErrorCodes.NOT_FOUND });
    }

    if (submission.speaker_id !== speaker.id) {
      throw new HttpError(403, 'Access denied', { code: ErrorCodes.AUTH_FORBIDDEN });
    }

    if (isCfpClosed()) {
      // Clients branch on `code === CFP_CLOSED_ERROR_CODE` — keep this body
      // hand-rolled so the shape stays byte-identical (plus requestId).
      return res.status(403).json({
        code: CFP_CLOSED_ERROR_CODE,
        error: 'CFP is closed. This submission cannot be submitted for review right now.',
        requestId,
      });
    }

    // Submit for review
    const { success, error } = await submitForReview(id, speaker.id);

    if (!success) {
      log.warn('Submission failed', { submissionId: id, speakerId: speaker.id, error });
      throw new HttpError(400, error || 'Failed to submit');
    }

    // Track submission for review
    await serverAnalytics.track('cfp_submission_submitted', speaker.id, {
      submission_id: id,
      submission_title: submission.title,
      submission_type: submission.submission_type,
      speaker_id: speaker.id,
    });

    // Send Slack notification for new talk submission
    notifyCfpTalkSubmitted({
      speakerId: speaker.id,
      speakerName: `${speaker.first_name} ${speaker.last_name}`,
      speakerEmail: speaker.email,
      talkId: id,
      talkTitle: submission.title,
      track: submission.submission_type,
    });

    log.info('Submission submitted for review', {
      submissionId: id,
      speakerId: speaker.id,
      title: submission.title,
    });

    return res.status(200).json({ success: true });
  }
);
