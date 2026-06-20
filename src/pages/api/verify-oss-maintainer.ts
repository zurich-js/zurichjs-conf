/**
 * OSS Maintainer Verification API
 *
 * POST /api/verify-oss-maintainer
 *
 * Runs the GitHub + npm auto-check, stores the request in `verification_requests`
 * with verification_type='oss_maintainer', notifies admins, and returns either:
 *   - success: 200 with verificationId and qualifying tier (admin still reviews)
 *   - hard reject: 200 with `qualified: false` and a reason (no DB row)
 *
 * Anti-abuse:
 *   - In-memory IP rate limit (5 attempts / hour)
 *   - Zod schema + honeypot
 *   - GitHub handle uniqueness (DB partial unique index — see migration)
 *   - Email uniqueness (re-application allowed only if previous was rejected)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServiceRoleClient } from '@/lib/supabase';
import type { Database, Json } from '@/lib/types/database';
import { getCurrencyFromCountry } from '@/config/currency';
import { logger } from '@/lib/logger';
import { notifyStatusVerification } from '@/lib/platform-notifications';
import { sendVerificationRequestEmail } from '@/lib/email';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { ossMaintainerSubmissionSchema } from '@/lib/validations/oss-maintainer';
import {
  resolveOssTicketPrice,
  runOssVerification,
  getOssSeatInfo,
  OSS_TIER_DISCOUNT,
} from '@/lib/oss';

type VerificationRequestInsert = Database['public']['Tables']['verification_requests']['Insert'];

const log = logger.scope('OSS Maintainer Verification API');

// 5 submissions per IP per hour — covers honest retries while blocking botnets.
const limiter = createRateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 5 });

interface ApiResponse {
  success: boolean;
  qualified: boolean;
  verificationId?: string;
  qualifyingTier?: 1 | 2 | 3 | 4;
  discountPercent?: number;
  message: string;
  reason?: string;
  hardRejectReason?: string;
  error?: string;
}

function getClientCountry(req: NextApiRequest): string | null {
  const cookieCountry = req.cookies['detected-country'];
  if (cookieCountry && /^[A-Z]{2}$/.test(cookieCountry)) return cookieCountry;
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, qualified: false, message: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);
  const rl = limiter.check(ip);
  if (!rl.allowed) {
    res.setHeader('Retry-After', Math.ceil((rl.resetAt - Date.now()) / 1000));
    res.status(429).json({
      success: false,
      qualified: false,
      message: 'Too many attempts. Please try again later.',
    });
    return;
  }

  const parsed = ossMaintainerSubmissionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      qualified: false,
      message: 'Validation failed',
      error: parsed.error.issues[0]?.message ?? 'Invalid input',
    });
    return;
  }

  const submission = parsed.data;

  try {
    // Seat cap check — fail fast before doing expensive GitHub/npm work.
    const seats = await getOssSeatInfo();
    if (seats.soldOut) {
      res.status(200).json({
        success: false,
        qualified: false,
        message: 'OSS maintainer tickets are sold out for this conference.',
        reason: 'OSS maintainer seats sold out',
      });
      return;
    }

    // Run auto-check first so we can short-circuit on hard rejects without storing.
    const autoCheck = await runOssVerification({
      githubUsername: submission.githubUsername,
      repos: submission.repos,
      npmPackages: submission.npmPackages ?? [],
    });

    if (autoCheck.hardRejectReason) {
      log.info('OSS submission hard-rejected', {
        githubUsername: submission.githubUsername,
        reason: autoCheck.hardRejectReason,
      });
      res.status(200).json({
        success: false,
        qualified: false,
        message: `We can't verify this submission automatically: ${autoCheck.hardRejectReason}`,
        hardRejectReason: autoCheck.hardRejectReason,
      });
      return;
    }

    if (autoCheck.qualifyingTier === null) {
      res.status(200).json({
        success: false,
        qualified: false,
        message:
          'Your project does not meet the "actively used" floor (≥500 stars or ≥1k weekly downloads). ' +
          'Reach out to hello@zurichjs.com if you think this is a mistake.',
        reason: autoCheck.notes.join(' ') || 'Below tier floor',
      });
      return;
    }

    const countryCode = getClientCountry(req);
    const currency = getCurrencyFromCountry(countryCode);

    // Resolve the current price for the chosen ticket tier so we can store it.
    const priceInfo = await resolveOssTicketPrice({
      ticketTier: submission.ticketTier,
      currency,
    });
    if (!priceInfo) {
      log.error('Failed to resolve OSS ticket price', null, {
        ticketTier: submission.ticketTier,
        currency,
      });
      res.status(500).json({
        success: false,
        qualified: false,
        message: 'Could not look up ticket pricing. Please email hello@zurichjs.com.',
      });
      return;
    }

    // Generate a stable verification ID up front.
    const verificationId = `VER-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`.toUpperCase();

    const supabase = createServiceRoleClient();
    const insertRow: VerificationRequestInsert = {
      verification_id: verificationId,
      name: submission.name,
      email: submission.email,
      verification_type: 'oss_maintainer',
      github_username: submission.githubUsername,
      oss_repos: autoCheck.repos as unknown as Json,
      npm_packages: autoCheck.npmPackages as unknown as Json,
      auto_check_result: autoCheck as unknown as Json,
      qualifying_tier: autoCheck.qualifyingTier,
      requested_ticket_tier: submission.ticketTier,
      additional_info: submission.additionalInfo || null,
      price_id: priceInfo.priceId,
      status: 'pending',
      country_code: countryCode,
      currency: priceInfo.currency,
    };
    const { error: insertError } = await supabase.from('verification_requests').insert(insertRow);

    if (insertError) {
      // Friendly handling for the github-username unique constraint.
      const isUniqueViolation = insertError.code === '23505';
      if (isUniqueViolation) {
        res.status(409).json({
          success: false,
          qualified: false,
          message: 'There is already a pending or approved OSS application for this GitHub account.',
        });
        return;
      }
      log.error('Failed to insert OSS verification request', insertError, {
        verificationId,
        githubUsername: submission.githubUsername,
      });
      res.status(500).json({
        success: false,
        qualified: false,
        message: 'Failed to record verification request. Please try again.',
      });
      return;
    }

    // Best-effort email + Slack notifications.
    try {
      await sendVerificationRequestEmail({
        to: submission.email,
        name: submission.name,
        verificationId,
        verificationType: 'oss_maintainer',
        githubUsername: submission.githubUsername,
        ossRepos: submission.repos,
        ossNpmPackages: submission.npmPackages,
        qualifyingTier: autoCheck.qualifyingTier,
        additionalInfo: submission.additionalInfo,
      });
    } catch (err) {
      log.error('Failed to send OSS verification email', err, { verificationId });
    }

    notifyStatusVerification({
      submissionId: verificationId,
      name: submission.name,
      email: submission.email,
      statusType: 'oss_maintainer',
      adminReviewUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://conf.zurichjs.com'}/admin/verifications`,
    });

    res.status(200).json({
      success: true,
      qualified: true,
      verificationId,
      qualifyingTier: autoCheck.qualifyingTier,
      discountPercent: OSS_TIER_DISCOUNT[autoCheck.qualifyingTier],
      message:
        `Application received. Based on your submission you qualify for the ` +
        `${OSS_TIER_DISCOUNT[autoCheck.qualifyingTier]}% off tier — ` +
        `our team will manually review and email you a payment link within 48 hours.`,
    });
  } catch (err) {
    log.error('Error processing OSS verification', err);
    res.status(500).json({
      success: false,
      qualified: false,
      message: 'Failed to process verification request',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
