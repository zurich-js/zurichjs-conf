/**
 * CFP Decision Workflow
 * Handles accept/reject decisions, coupon generation, and email sending
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { getStripeClient } from '@/lib/stripe/client';
import { logger } from '@/lib/logger';
import { sendCfpAcceptanceEmail, sendCfpRejectionEmail } from '@/lib/email/cfp-decision-emails';
import type {
  MakeDecisionRequest,
  MakeDecisionResult,
  CfpDecisionStatus,
  CfpDecisionEvent,
} from '@/lib/types/cfp/decisions';

const log = logger.scope('CfpDecisions');

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
 * Generate a unique coupon code for CFP rejection
 */
function generateCouponCode(): string {
  const prefix = 'CFPTHX';
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${randomPart}`;
}

/**
 * Create a Stripe coupon for a rejected speaker
 * @param discountPercent - Discount percentage (capped at 80%)
 * @param expiresAt - Optional expiry date for the coupon
 */
export async function createCfpRejectionCoupon(
  discountPercent: number = 20,
  expiresAt?: Date
): Promise<{ code: string; stripe_coupon_id: string; stripe_promo_id: string; expires_at?: string }> {
  const stripe = getStripeClient();
  const code = generateCouponCode();

  // Cap discount at 80%
  const cappedDiscount = Math.min(discountPercent, 80);

  log.info('Creating CFP rejection coupon', { code, discountPercent: cappedDiscount, expiresAt });

  // Create Stripe coupon with optional expiry
  const stripeCoupon = await stripe.coupons.create({
    id: code,
    name: `CFP Thank You: ${code}`,
    percent_off: cappedDiscount,
    max_redemptions: 1,
    ...(expiresAt && { redeem_by: Math.floor(expiresAt.getTime() / 1000) }),
    metadata: {
      type: 'cfp_rejection',
      created_for: 'rejected_speaker',
      ...(expiresAt && { expires_at: expiresAt.toISOString() }),
    },
  });

  // Create promotion code for easier use
  const promotionCode = await stripe.promotionCodes.create({
    promotion: { type: 'coupon', coupon: stripeCoupon.id },
    code: code,
    max_redemptions: 1,
    ...(expiresAt && { expires_at: Math.floor(expiresAt.getTime() / 1000) }),
    metadata: {
      type: 'cfp_rejection',
    },
  });

  log.info('CFP rejection coupon created', {
    code,
    stripe_coupon_id: stripeCoupon.id,
    stripe_promo_id: promotionCode.id,
    expires_at: expiresAt?.toISOString(),
  });

  return {
    code,
    stripe_coupon_id: stripeCoupon.id,
    stripe_promo_id: promotionCode.id,
    ...(expiresAt && { expires_at: expiresAt.toISOString() }),
  };
}

/**
 * Log a decision event for audit trail
 */
async function logDecisionEvent(event: Omit<CfpDecisionEvent, 'id' | 'created_at'>): Promise<void> {
  const supabase = createCfpServiceClient();

  const { error } = await supabase
    .from('cfp_decision_events')
    .insert({
      submission_id: event.submission_id,
      event_type: event.event_type,
      previous_status: event.previous_status,
      new_status: event.new_status,
      admin_id: event.admin_id,
      notes: event.notes,
      metadata: event.metadata,
    });

  if (error) {
    log.warn('Failed to log decision event', { error: error.message, event });
  }
}

/**
 * Make a decision on a submission (accept or reject)
 */
export async function makeDecision(
  request: MakeDecisionRequest,
  adminId: string
): Promise<MakeDecisionResult> {
  const supabase = createCfpServiceClient();

  log.info('Making decision on submission', {
    submission_id: request.submission_id,
    decision: request.decision,
    admin_id: adminId,
  });

  try {
    // 1. Get submission with speaker info
    const { data: submission, error: fetchError } = await supabase
      .from('cfp_submissions')
      .select(`
        *,
        speaker:cfp_speakers(*)
      `)
      .eq('id', request.submission_id)
      .single();

    if (fetchError || !submission) {
      log.error('Submission not found', { submission_id: request.submission_id });
      return { success: false, error: 'Submission not found' };
    }

    const speaker = submission.speaker;
    if (!speaker) {
      log.error('Speaker not found for submission', { submission_id: request.submission_id });
      return { success: false, error: 'Speaker not found' };
    }

    // Check for idempotency - don't re-send emails if already decided
    const previousStatus = submission.decision_status as CfpDecisionStatus | null;
    if (previousStatus === request.decision) {
      log.info('Submission already has this decision', {
        submission_id: request.submission_id,
        decision: request.decision,
      });
      return {
        success: true,
        decision_status: request.decision,
        email_sent: false,
      };
    }

    // 2. Prepare update data
    const newStatus: CfpDecisionStatus = request.decision;
    const updateData: Record<string, unknown> = {
      decision_status: newStatus,
      decision_at: new Date().toISOString(),
      decision_by: adminId,
      decision_notes: request.notes || null,
      // Also update the main status field for backward compatibility
      status: request.decision,
      updated_at: new Date().toISOString(),
    };

    // 3. Generate coupon for rejections if requested
    let couponCode: string | undefined;
    if (request.decision === 'rejected' && request.generate_coupon) {
      const discountPercent = request.coupon_discount_percent || 15;
      const coupon = await createCfpRejectionCoupon(discountPercent);
      couponCode = coupon.code;
      updateData.coupon_code = couponCode;
      updateData.coupon_generated_at = new Date().toISOString();
    }

    // 4. Update submission
    const { error: updateError } = await supabase
      .from('cfp_submissions')
      .update(updateData)
      .eq('id', request.submission_id);

    if (updateError) {
      log.error('Failed to update submission', { error: updateError.message });
      return { success: false, error: `Failed to update submission: ${updateError.message}` };
    }

    // 5. Log the decision event
    await logDecisionEvent({
      submission_id: request.submission_id,
      event_type: 'decision_made',
      previous_status: previousStatus || 'undecided',
      new_status: newStatus,
      admin_id: adminId,
      notes: request.notes || null,
      metadata: couponCode ? { coupon_code: couponCode } : null,
    });

    // 6. Send email if requested
    let emailSent = false;
    if (request.send_email) {
      const emailResult = await sendDecisionEmail({
        decision: request.decision,
        speaker_name: speaker.name || speaker.email,
        speaker_email: speaker.email,
        talk_title: submission.title,
        submission_type: submission.submission_type,
        personal_message: request.personal_message,
        coupon_code: couponCode,
        coupon_discount_percent: request.coupon_discount_percent,
      });

      if (emailResult.success) {
        emailSent = true;
        // Update email sent timestamp
        await supabase
          .from('cfp_submissions')
          .update({
            decision_email_sent_at: new Date().toISOString(),
            decision_email_id: emailResult.email_id,
          })
          .eq('id', request.submission_id);

        // Log email event
        await logDecisionEvent({
          submission_id: request.submission_id,
          event_type: 'email_sent',
          previous_status: newStatus,
          new_status: newStatus,
          admin_id: adminId,
          notes: null,
          metadata: { email_id: emailResult.email_id },
        });
      } else {
        log.warn('Failed to send decision email', {
          submission_id: request.submission_id,
          error: emailResult.error,
        });
      }
    }

    log.info('Decision made successfully', {
      submission_id: request.submission_id,
      decision: request.decision,
      email_sent: emailSent,
      coupon_code: couponCode,
    });

    return {
      success: true,
      decision_status: newStatus,
      coupon_code: couponCode,
      email_sent: emailSent,
    };
  } catch (error) {
    log.error('Error making decision', error, { submission_id: request.submission_id });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Send decision email to speaker
 */
async function sendDecisionEmail(params: {
  decision: 'accepted' | 'rejected';
  speaker_name: string;
  speaker_email: string;
  talk_title: string;
  submission_type: 'lightning' | 'standard' | 'workshop';
  personal_message?: string;
  coupon_code?: string;
  coupon_discount_percent?: number;
}): Promise<{ success: boolean; email_id?: string; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://conf.zurichjs.com';
  const conferenceName = 'ZurichJS Conference 2026';
  const conferenceDate = 'September 27, 2026';

  if (params.decision === 'accepted') {
    // Note: This code path is deprecated. Use scheduled-emails.ts instead.
    // The acceptance email now requires a confirmation_url with a token,
    // which is generated in scheduleAcceptanceEmail.
    return sendCfpAcceptanceEmail({
      to: params.speaker_email,
      speaker_name: params.speaker_name,
      first_name: params.speaker_name.split(' ')[0],
      talk_title: params.talk_title,
      submission_type: params.submission_type,
      conference_name: conferenceName,
      conference_date: conferenceDate,
      personal_message: params.personal_message,
      confirmation_url: `${baseUrl}/cfp/speaker`,
    });
  } else {
    return sendCfpRejectionEmail({
      to: params.speaker_email,
      speaker_name: params.speaker_name,
      talk_title: params.talk_title,
      conference_name: conferenceName,
      personal_message: params.personal_message,
      coupon_code: params.coupon_code,
      coupon_discount_percent: params.coupon_discount_percent,
      tickets_url: `${baseUrl}/tickets`,
    });
  }
}

/**
 * Get decision status for a submission
 */
export async function getDecisionStatus(submissionId: string): Promise<{
  decision_status: CfpDecisionStatus;
  decision_at: string | null;
  decision_by: string | null;
  coupon_code: string | null;
  email_sent_at: string | null;
} | null> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_submissions')
    .select('decision_status, decision_at, decision_by, coupon_code, decision_email_sent_at')
    .eq('id', submissionId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    decision_status: (data.decision_status as CfpDecisionStatus) || 'undecided',
    decision_at: data.decision_at,
    decision_by: data.decision_by,
    coupon_code: data.coupon_code,
    email_sent_at: data.decision_email_sent_at,
  };
}

/**
 * Get decision history for a submission
 */
export async function getDecisionHistory(submissionId: string): Promise<CfpDecisionEvent[]> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_decision_events')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: false });

  if (error) {
    log.error('Failed to fetch decision history', { error: error.message, submissionId });
    return [];
  }

  return (data || []) as CfpDecisionEvent[];
}

/**
 * Bulk make decisions on multiple submissions
 */
export async function bulkMakeDecision(
  submissionIds: string[],
  decision: 'accepted' | 'rejected',
  adminId: string,
  options?: {
    notes?: string;
    generate_coupon?: boolean;
    coupon_discount_percent?: number;
    send_email?: boolean;
    personal_message?: string;
  }
): Promise<{
  success: number;
  failed: number;
  errors: Array<{ submission_id: string; error: string }>;
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ submission_id: string; error: string }>,
  };

  for (const submissionId of submissionIds) {
    const result = await makeDecision(
      {
        submission_id: submissionId,
        decision,
        notes: options?.notes,
        generate_coupon: options?.generate_coupon,
        coupon_discount_percent: options?.coupon_discount_percent,
        send_email: options?.send_email,
        personal_message: options?.personal_message,
      },
      adminId
    );

    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({ submission_id: submissionId, error: result.error || 'Unknown error' });
    }
  }

  log.info('Bulk decision completed', {
    decision,
    total: submissionIds.length,
    success: results.success,
    failed: results.failed,
  });

  return results;
}
