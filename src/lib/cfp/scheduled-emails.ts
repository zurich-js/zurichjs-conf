/**
 * CFP Scheduled Emails
 * Handles scheduling, sending, and cancelling CFP decision emails
 * Emails are scheduled with a 30-minute delay to allow cancellation
 */

import * as React from 'react';
import { createClient } from '@supabase/supabase-js';
import { render } from '@react-email/render';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { getResendClient, EMAIL_CONFIG } from '@/lib/email/config';
import { CfpAcceptanceEmail } from '@/emails/templates/CfpAcceptanceEmail';
import { CfpRejectionEmail } from '@/emails/templates/CfpRejectionEmail';
import { EMAIL_SCHEDULING, REJECTION_COUPON, CONFERENCE_SLOTS } from './config';
import { createCfpRejectionCoupon } from './decisions';
import type {
  CfpEmailType,
  CfpScheduledEmail,
  CfpScheduledEmailStatus,
  ScheduleEmailRequest,
  ScheduleEmailResult,
  CfpAcceptanceEmailData,
  CfpRejectionEmailData,
} from '@/lib/types/cfp/decisions';
import { notifyCfpEmailScheduled } from '@/lib/platform-notifications/send';

const log = logger.scope('CfpScheduledEmails');

/**
 * Create Supabase client for CFP operations
 */
function createCfpServiceClient() {
  return createClient(
    env.supabase.url,
    env.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Calculate scheduled send time (30 minutes from now)
 */
function calculateScheduledTime(): Date {
  return new Date(Date.now() + EMAIL_SCHEDULING.DELAY_MINUTES * 60 * 1000);
}

/**
 * Calculate coupon expiry date
 */
function calculateCouponExpiry(validityDays: number): Date {
  const days = Math.max(
    REJECTION_COUPON.MIN_VALIDITY_DAYS,
    Math.min(REJECTION_COUPON.MAX_VALIDITY_DAYS, validityDays)
  );
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * Validate discount percentage within allowed range
 */
function validateDiscountPercent(percent?: number): number {
  if (!percent) return REJECTION_COUPON.DEFAULT_DISCOUNT_PERCENT;
  return Math.max(
    REJECTION_COUPON.MIN_DISCOUNT_PERCENT,
    Math.min(REJECTION_COUPON.MAX_DISCOUNT_PERCENT, percent)
  );
}

/**
 * Submission data needed for emails
 */
interface SubmissionForEmail {
  id: string;
  title: string;
  submission_type: 'lightning' | 'standard' | 'workshop';
  decision_status: string | null;
  speaker: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

/**
 * Get submission with speaker data for email
 */
async function getSubmissionForEmail(submissionId: string): Promise<SubmissionForEmail | null> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_submissions')
    .select(`
      id,
      title,
      submission_type,
      decision_status,
      speaker:cfp_speakers(
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('id', submissionId)
    .single();

  if (error || !data) {
    log.error('Failed to fetch submission for email', { submissionId, error: error?.message });
    return null;
  }

  // Handle speaker data (may be array or object from Supabase join)
  const speakerData = Array.isArray(data.speaker) ? data.speaker[0] : data.speaker;

  return {
    id: data.id,
    title: data.title,
    submission_type: data.submission_type,
    decision_status: data.decision_status,
    speaker: speakerData || null,
  } as SubmissionForEmail;
}

/**
 * Get CFP statistics for rejection email transparency
 */
async function getCfpStats(): Promise<{
  total_submissions: number;
  total_reviews: number;
}> {
  const supabase = createCfpServiceClient();

  const [submissionsResult, reviewsResult] = await Promise.all([
    // Count ALL submissions (not just pending) for transparency
    supabase
      .from('cfp_submissions')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('cfp_reviews')
      .select('id', { count: 'exact', head: true }),
  ]);

  return {
    total_submissions: submissionsResult.count || 0,
    total_reviews: reviewsResult.count || 0,
  };
}

/**
 * Check if speaker has other pending submissions
 */
async function hasOtherPendingSubmissions(speakerId: string, excludeSubmissionId: string): Promise<boolean> {
  const supabase = createCfpServiceClient();

  const { count } = await supabase
    .from('cfp_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('speaker_id', speakerId)
    .neq('id', excludeSubmissionId)
    .in('decision_status', ['undecided']);

  return (count || 0) > 0;
}

/**
 * Check for existing pending scheduled email
 */
export async function getPendingScheduledEmail(
  submissionId: string,
  emailType: CfpEmailType
): Promise<CfpScheduledEmail | null> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_scheduled_emails')
    .select('*')
    .eq('submission_id', submissionId)
    .eq('email_type', emailType)
    .eq('status', 'pending')
    .single();

  if (error || !data) {
    return null;
  }

  return data as CfpScheduledEmail;
}

/**
 * Schedule an acceptance email with 30-minute delay
 */
export async function scheduleAcceptanceEmail(
  request: ScheduleEmailRequest,
  adminId: string
): Promise<ScheduleEmailResult> {
  const supabase = createCfpServiceClient();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://conf.zurichjs.com';

  log.info('Scheduling acceptance email', { submission_id: request.submission_id, admin_id: adminId });

  try {
    // Check for existing pending email
    const existingEmail = await getPendingScheduledEmail(request.submission_id, 'acceptance');
    if (existingEmail) {
      return {
        success: false,
        error: 'An acceptance email is already scheduled for this submission',
        scheduled_email: existingEmail,
      };
    }

    // Get submission and speaker data
    const submission = await getSubmissionForEmail(request.submission_id);
    if (!submission) {
      return { success: false, error: 'Submission not found' };
    }

    const speaker = submission.speaker;
    if (!speaker) {
      return { success: false, error: 'Speaker not found' };
    }

    // Create attendance confirmation record (without token - speakers confirm via dashboard)
    const { error: attendanceError } = await supabase
      .from('cfp_speaker_attendance')
      .upsert({
        speaker_id: speaker.id,
        submission_id: request.submission_id,
        status: 'pending',
        confirmation_token: `dashboard-${speaker.id}-${request.submission_id}`, // Placeholder token
        token_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Far future
      }, {
        onConflict: 'speaker_id,submission_id',
      });

    if (attendanceError) {
      log.error('Failed to create attendance record', { error: attendanceError.message });
      return { success: false, error: 'Failed to create attendance confirmation' };
    }

    // Compose speaker full name
    const speakerFullName = `${speaker.first_name} ${speaker.last_name}`.trim() || speaker.email;

    // Prepare email data - link to dashboard where speakers can confirm
    const emailData: CfpAcceptanceEmailData = {
      to: speaker.email,
      speaker_name: speakerFullName,
      first_name: speaker.first_name || 'there',
      talk_title: submission.title,
      submission_type: submission.submission_type,
      conference_name: 'ZurichJS Conference 2026',
      conference_date: 'September 27, 2026',
      personal_message: request.personal_message,
      confirmation_url: `${baseUrl}/cfp/dashboard`,
    };

    // Render email
    const emailHtml = await render(
      React.createElement(CfpAcceptanceEmail, emailData)
    );

    // Calculate scheduled time
    const scheduledFor = calculateScheduledTime();

    // Send via Resend with scheduled time
    const resend = getResendClient();
    const subject = `Congratulations! Your talk "${submission.title}" has been accepted to ZurichJS Conference 2026`;

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: speaker.email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject,
      html: emailHtml,
      scheduledAt: scheduledFor.toISOString(),
    });

    if (result.error) {
      log.error('Failed to schedule email with Resend', { error: result.error.message });
      return { success: false, error: `Failed to schedule email: ${result.error.message}` };
    }

    // Store scheduled email record
    const { data: scheduledEmail, error: insertError } = await supabase
      .from('cfp_scheduled_emails')
      .insert({
        submission_id: request.submission_id,
        email_type: 'acceptance',
        scheduled_for: scheduledFor.toISOString(),
        resend_email_id: result.data?.id,
        status: 'pending',
        recipient_email: speaker.email,
        recipient_name: speakerFullName,
        talk_title: submission.title,
        personal_message: request.personal_message || null,
        scheduled_by: adminId,
      })
      .select()
      .single();

    if (insertError) {
      log.error('Failed to store scheduled email record', { error: insertError.message });
      // Email is scheduled but not tracked - log warning but don't fail
      log.warn('Email scheduled but record not stored', {
        resend_email_id: result.data?.id,
        submission_id: request.submission_id,
      });
    }

    // Update submission with scheduled email info + mark decision email as sent
    // (since there's no Resend webhook to track delivery, we set it at scheduling time)
    await supabase
      .from('cfp_submissions')
      .update({
        acceptance_email_scheduled_for: scheduledFor.toISOString(),
        acceptance_email_scheduled_id: scheduledEmail?.id || null,
        decision_email_sent_at: scheduledFor.toISOString(),
      })
      .eq('id', request.submission_id);

    log.info('Acceptance email scheduled successfully', {
      submission_id: request.submission_id,
      scheduled_for: scheduledFor.toISOString(),
      resend_email_id: result.data?.id,
    });

    // Send Slack notification
    notifyCfpEmailScheduled({
      submissionId: request.submission_id,
      emailType: 'acceptance',
      speakerName: speakerFullName,
      speakerEmail: speaker.email,
      talkTitle: submission.title,
      scheduledFor: scheduledFor.toISOString(),
    });

    return {
      success: true,
      scheduled_email: scheduledEmail as CfpScheduledEmail,
      scheduled_for: scheduledFor.toISOString(),
    };
  } catch (error) {
    log.error('Error scheduling acceptance email', error, { submission_id: request.submission_id });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Schedule a rejection email with 30-minute delay
 */
export async function scheduleRejectionEmail(
  request: ScheduleEmailRequest,
  adminId: string
): Promise<ScheduleEmailResult> {
  const supabase = createCfpServiceClient();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://conf.zurichjs.com';

  log.info('Scheduling rejection email', { submission_id: request.submission_id, admin_id: adminId });

  try {
    // Check for existing pending email
    const existingEmail = await getPendingScheduledEmail(request.submission_id, 'rejection');
    if (existingEmail) {
      return {
        success: false,
        error: 'A rejection email is already scheduled for this submission',
        scheduled_email: existingEmail,
      };
    }

    // Get submission and speaker data
    const submission = await getSubmissionForEmail(request.submission_id);
    if (!submission) {
      return { success: false, error: 'Submission not found' };
    }

    const speaker = submission.speaker;
    if (!speaker) {
      return { success: false, error: 'Speaker not found' };
    }

    // Generate coupon if discount percent is provided
    let couponCode: string | undefined;
    let couponExpiresAt: Date | undefined;
    const discountPercent = request.coupon_discount_percent
      ? validateDiscountPercent(request.coupon_discount_percent)
      : undefined;

    if (discountPercent) {
      const validityDays = request.coupon_validity_days || REJECTION_COUPON.DEFAULT_VALIDITY_DAYS;
      couponExpiresAt = calculateCouponExpiry(validityDays);

      const coupon = await createCfpRejectionCoupon(discountPercent, couponExpiresAt);
      couponCode = coupon.code;

      // Store coupon on submission
      await supabase
        .from('cfp_submissions')
        .update({
          coupon_code: couponCode,
          coupon_generated_at: new Date().toISOString(),
        })
        .eq('id', request.submission_id);
    }

    // Get CFP stats for transparency
    const stats = await getCfpStats();
    const hasOtherPending = await hasOtherPendingSubmissions(speaker.id, request.submission_id);

    // Compose speaker full name
    const speakerFullName = `${speaker.first_name} ${speaker.last_name}`.trim() || speaker.email;

    // Prepare email data
    const emailData: CfpRejectionEmailData = {
      to: speaker.email,
      speaker_name: speakerFullName,
      talk_title: submission.title,
      conference_name: 'ZurichJS Conference 2026',
      personal_message: request.personal_message,
      coupon_code: couponCode,
      coupon_discount_percent: discountPercent,
      coupon_expires_at: couponExpiresAt?.toISOString(),
      tickets_url: `${baseUrl}/#tickets`,
      // Transparency stats
      total_submissions: stats.total_submissions,
      total_reviews: stats.total_reviews,
      workshop_slots_min: CONFERENCE_SLOTS.WORKSHOPS_MIN,
      workshop_slots_max: CONFERENCE_SLOTS.WORKSHOPS_MAX,
      talks_total: CONFERENCE_SLOTS.TALKS_TOTAL,
      talks_from_cfp: CONFERENCE_SLOTS.TALKS_FROM_CFP,
      // Feedback
      include_feedback: request.include_feedback,
      feedback_text: request.feedback_text,
      // Multi-submission
      has_other_pending_submissions: hasOtherPending,
    };

    // Render email
    const emailHtml = await render(
      React.createElement(CfpRejectionEmail, emailData)
    );

    // Calculate scheduled time
    const scheduledFor = calculateScheduledTime();

    // Send via Resend with scheduled time
    const resend = getResendClient();
    const subject = `Update on your ZurichJS Conference 2026 submission`;

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: speaker.email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject,
      html: emailHtml,
      scheduledAt: scheduledFor.toISOString(),
    });

    if (result.error) {
      log.error('Failed to schedule email with Resend', { error: result.error.message });
      return { success: false, error: `Failed to schedule email: ${result.error.message}` };
    }

    // Store scheduled email record
    const { data: scheduledEmail, error: insertError } = await supabase
      .from('cfp_scheduled_emails')
      .insert({
        submission_id: request.submission_id,
        email_type: 'rejection',
        scheduled_for: scheduledFor.toISOString(),
        resend_email_id: result.data?.id,
        status: 'pending',
        recipient_email: speaker.email,
        recipient_name: speakerFullName,
        talk_title: submission.title,
        personal_message: request.personal_message || null,
        coupon_code: couponCode || null,
        coupon_discount_percent: discountPercent || null,
        coupon_expires_at: couponExpiresAt?.toISOString() || null,
        include_feedback: request.include_feedback || false,
        feedback_text: request.feedback_text || null,
        scheduled_by: adminId,
      })
      .select()
      .single();

    if (insertError) {
      log.error('Failed to store scheduled email record', { error: insertError.message });
    }

    // Update submission with scheduled email info + mark decision email as sent
    // (since there's no Resend webhook to track delivery, we set it at scheduling time)
    await supabase
      .from('cfp_submissions')
      .update({
        rejection_email_scheduled_for: scheduledFor.toISOString(),
        rejection_email_scheduled_id: scheduledEmail?.id || null,
        decision_email_sent_at: scheduledFor.toISOString(),
      })
      .eq('id', request.submission_id);

    log.info('Rejection email scheduled successfully', {
      submission_id: request.submission_id,
      scheduled_for: scheduledFor.toISOString(),
      resend_email_id: result.data?.id,
      has_coupon: !!couponCode,
    });

    // Send Slack notification
    notifyCfpEmailScheduled({
      submissionId: request.submission_id,
      emailType: 'rejection',
      speakerName: speakerFullName,
      speakerEmail: speaker.email,
      talkTitle: submission.title,
      scheduledFor: scheduledFor.toISOString(),
      hasCoupon: !!couponCode,
      couponDiscountPercent: discountPercent,
    });

    return {
      success: true,
      scheduled_email: scheduledEmail as CfpScheduledEmail,
      scheduled_for: scheduledFor.toISOString(),
    };
  } catch (error) {
    log.error('Error scheduling rejection email', error, { submission_id: request.submission_id });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Cancel a scheduled email
 */
export async function cancelScheduledEmail(
  scheduledEmailId: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createCfpServiceClient();

  log.info('Cancelling scheduled email', { scheduled_email_id: scheduledEmailId, admin_id: adminId });

  try {
    // Get the scheduled email
    const { data: scheduledEmail, error: fetchError } = await supabase
      .from('cfp_scheduled_emails')
      .select('*')
      .eq('id', scheduledEmailId)
      .single();

    if (fetchError || !scheduledEmail) {
      return { success: false, error: 'Scheduled email not found' };
    }

    if (scheduledEmail.status !== 'pending') {
      return { success: false, error: `Cannot cancel email with status: ${scheduledEmail.status}` };
    }

    // Cancel in Resend if we have the email ID
    if (scheduledEmail.resend_email_id) {
      try {
        const resend = getResendClient();
        await resend.emails.cancel(scheduledEmail.resend_email_id);
        log.info('Email cancelled in Resend', { resend_email_id: scheduledEmail.resend_email_id });
      } catch (resendError) {
        // Log but continue - the email might have already been sent
        log.warn('Failed to cancel email in Resend', {
          resend_email_id: scheduledEmail.resend_email_id,
          error: resendError instanceof Error ? resendError.message : 'Unknown error',
        });
      }
    }

    // Update status in database
    const { error: updateError } = await supabase
      .from('cfp_scheduled_emails')
      .update({
        status: 'cancelled' as CfpScheduledEmailStatus,
        cancelled_at: new Date().toISOString(),
        cancelled_by: adminId,
      })
      .eq('id', scheduledEmailId);

    if (updateError) {
      log.error('Failed to update scheduled email status', {
        error: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
      });
      return { success: false, error: `Failed to update email status: ${updateError.message}` };
    }

    // Clear scheduled email reference and undo decision_email_sent_at
    const clearColumn = scheduledEmail.email_type === 'acceptance'
      ? { acceptance_email_scheduled_for: null, acceptance_email_scheduled_id: null, decision_email_sent_at: null }
      : { rejection_email_scheduled_for: null, rejection_email_scheduled_id: null, decision_email_sent_at: null };

    await supabase
      .from('cfp_submissions')
      .update(clearColumn)
      .eq('id', scheduledEmail.submission_id);

    log.info('Scheduled email cancelled successfully', {
      scheduled_email_id: scheduledEmailId,
      submission_id: scheduledEmail.submission_id,
      email_type: scheduledEmail.email_type,
    });

    return { success: true };
  } catch (error) {
    log.error('Error cancelling scheduled email', error, { scheduled_email_id: scheduledEmailId });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get all scheduled emails for a submission
 */
export async function getScheduledEmailsForSubmission(
  submissionId: string
): Promise<CfpScheduledEmail[]> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_scheduled_emails')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: false });

  if (error) {
    log.error('Failed to fetch scheduled emails', { error: error.message, submissionId });
    return [];
  }

  return (data || []) as CfpScheduledEmail[];
}

/**
 * Mark a scheduled email as sent (called by cron/webhook after email is delivered)
 * Also updates decision_email_sent_at on the submission so the speaker can see the status change
 */
export async function markEmailAsSent(
  resendEmailId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createCfpServiceClient();
  const sentAt = new Date().toISOString();

  // First, get the scheduled email to find the submission_id
  const { data: scheduledEmail } = await supabase
    .from('cfp_scheduled_emails')
    .select('submission_id')
    .eq('resend_email_id', resendEmailId)
    .single();

  const { error } = await supabase
    .from('cfp_scheduled_emails')
    .update({
      status: 'sent' as CfpScheduledEmailStatus,
      sent_at: sentAt,
    })
    .eq('resend_email_id', resendEmailId);

  if (error) {
    log.error('Failed to mark email as sent', { error: error.message, resendEmailId });
    return { success: false, error: error.message };
  }

  // Update decision_email_sent_at on the submission so the speaker dashboard reveals the status
  if (scheduledEmail?.submission_id) {
    await supabase
      .from('cfp_submissions')
      .update({ decision_email_sent_at: sentAt })
      .eq('id', scheduledEmail.submission_id);
  }

  return { success: true };
}

/**
 * Mark a scheduled email as failed
 */
export async function markEmailAsFailed(
  resendEmailId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createCfpServiceClient();

  const { error } = await supabase
    .from('cfp_scheduled_emails')
    .update({
      status: 'failed' as CfpScheduledEmailStatus,
      failed_at: new Date().toISOString(),
      failure_reason: reason,
    })
    .eq('resend_email_id', resendEmailId);

  if (error) {
    log.error('Failed to mark email as failed', { error: error.message, resendEmailId });
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Send a scheduled email immediately (force send)
 * Cancels the scheduled email and sends it right away
 */
export async function sendScheduledEmailNow(
  scheduledEmailId: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createCfpServiceClient();

  log.info('Force sending scheduled email now', { scheduled_email_id: scheduledEmailId, admin_id: adminId });

  try {
    // Get the scheduled email
    const { data: scheduledEmail, error: fetchError } = await supabase
      .from('cfp_scheduled_emails')
      .select('*')
      .eq('id', scheduledEmailId)
      .single();

    if (fetchError || !scheduledEmail) {
      return { success: false, error: 'Scheduled email not found' };
    }

    if (scheduledEmail.status !== 'pending') {
      return { success: false, error: `Cannot send email with status: ${scheduledEmail.status}` };
    }

    // Cancel the scheduled email in Resend first
    if (scheduledEmail.resend_email_id) {
      try {
        const resend = getResendClient();
        await resend.emails.cancel(scheduledEmail.resend_email_id);
        log.info('Scheduled email cancelled in Resend for immediate send', { resend_email_id: scheduledEmail.resend_email_id });
      } catch (resendError) {
        // If cancel fails, the email might have already been sent or passed the cancellation window
        log.warn('Failed to cancel scheduled email in Resend', {
          resend_email_id: scheduledEmail.resend_email_id,
          error: resendError instanceof Error ? resendError.message : 'Unknown error',
        });
      }
    }

    // Get submission and speaker data to re-render the email
    const submission = await getSubmissionForEmail(scheduledEmail.submission_id);
    if (!submission) {
      return { success: false, error: 'Submission not found' };
    }

    const speaker = submission.speaker;
    if (!speaker) {
      return { success: false, error: 'Speaker not found' };
    }

    const speakerFullName = `${speaker.first_name} ${speaker.last_name}`.trim() || speaker.email;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://conf.zurichjs.com';
    const resend = getResendClient();

    let subject: string;
    let emailHtml: string;

    if (scheduledEmail.email_type === 'acceptance') {
      // Acceptance email links to dashboard where speakers can confirm
      const emailData: CfpAcceptanceEmailData = {
        to: speaker.email,
        speaker_name: speakerFullName,
        first_name: speaker.first_name || 'there',
        talk_title: submission.title,
        submission_type: submission.submission_type,
        conference_name: 'ZurichJS Conference 2026',
        conference_date: 'September 27, 2026',
        personal_message: scheduledEmail.personal_message || undefined,
        confirmation_url: `${baseUrl}/cfp/dashboard`,
      };

      emailHtml = await render(
        React.createElement(CfpAcceptanceEmail, emailData)
      );
      subject = `Congratulations! Your talk "${submission.title}" has been accepted to ZurichJS Conference 2026`;
    } else {
      // Rejection email
      const stats = await getCfpStats();
      const hasOtherPending = await hasOtherPendingSubmissions(speaker.id, scheduledEmail.submission_id);

      const emailData: CfpRejectionEmailData = {
        to: speaker.email,
        speaker_name: speakerFullName,
        talk_title: submission.title,
        conference_name: 'ZurichJS Conference 2026',
        personal_message: scheduledEmail.personal_message || undefined,
        coupon_code: scheduledEmail.coupon_code || undefined,
        coupon_discount_percent: scheduledEmail.coupon_discount_percent || undefined,
        coupon_expires_at: scheduledEmail.coupon_expires_at || undefined,
        tickets_url: `${baseUrl}/#tickets`,
        total_submissions: stats.total_submissions,
        total_reviews: stats.total_reviews,
        workshop_slots_min: CONFERENCE_SLOTS.WORKSHOPS_MIN,
        workshop_slots_max: CONFERENCE_SLOTS.WORKSHOPS_MAX,
        talks_total: CONFERENCE_SLOTS.TALKS_TOTAL,
        talks_from_cfp: CONFERENCE_SLOTS.TALKS_FROM_CFP,
        include_feedback: scheduledEmail.include_feedback || false,
        feedback_text: scheduledEmail.feedback_text || undefined,
        has_other_pending_submissions: hasOtherPending,
      };

      emailHtml = await render(
        React.createElement(CfpRejectionEmail, emailData)
      );
      subject = `Update on your ZurichJS Conference 2026 submission`;
    }

    // Send immediately (no scheduledAt)
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: speaker.email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject,
      html: emailHtml,
    });

    if (result.error) {
      log.error('Failed to send email immediately', { error: result.error.message });
      return { success: false, error: `Failed to send email: ${result.error.message}` };
    }

    // Update the scheduled email record to sent
    const sentAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('cfp_scheduled_emails')
      .update({
        status: 'sent' as CfpScheduledEmailStatus,
        sent_at: sentAt,
        resend_email_id: result.data?.id, // Update with new email ID
      })
      .eq('id', scheduledEmailId);

    if (updateError) {
      log.error('Failed to update scheduled email status after sending', { error: updateError.message });
      // Email was sent, just logging failed - don't fail the request
    }

    // Update decision_email_sent_at on the submission so the speaker dashboard reveals the status
    await supabase
      .from('cfp_submissions')
      .update({ decision_email_sent_at: sentAt })
      .eq('id', scheduledEmail.submission_id);

    log.info('Scheduled email sent immediately', {
      scheduled_email_id: scheduledEmailId,
      submission_id: scheduledEmail.submission_id,
      email_type: scheduledEmail.email_type,
      new_resend_email_id: result.data?.id,
    });

    return { success: true };
  } catch (error) {
    log.error('Error sending scheduled email immediately', error, { scheduled_email_id: scheduledEmailId });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
