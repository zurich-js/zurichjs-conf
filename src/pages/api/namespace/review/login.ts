import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { clientEnv } from '@/config/env';
import { getBaseUrl } from '@/lib/url';
import { logger } from '@/lib/logger';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { isNamespaceStudentSponsorshipReviewer } from '@/lib/namespace/student-sponsorship-persistence';

const log = logger.scope('Namespace Review Login API');

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
});

const rateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
});

interface NamespaceReviewLoginResponse {
  success: boolean;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NamespaceReviewLoginResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const rateLimit = rateLimiter.check(getClientIp(req));

  if (!rateLimit.allowed) {
    return res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please try again later.',
    });
  }

  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error.issues[0]?.message || 'Invalid email',
    });
  }

  try {
    const email = result.data.email;
    const isReviewer = await isNamespaceStudentSponsorshipReviewer(email);

    if (!isReviewer) {
      log.warn('Rejected Namespace review login for non-reviewer', { email });
      return res.status(403).json({
        success: false,
        error: 'This email is not allowed to access Namespace sponsorship applications.',
      });
    }

    const supabase = createClient(clientEnv.supabase.url, clientEnv.supabase.publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const redirectTo = `${getBaseUrl(req)}/namespace/review/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      log.error('Failed to send Namespace review magic link', error, { email });
      return res.status(500).json({
        success: false,
        error: 'Failed to send magic link.',
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    log.error('Unexpected Namespace review login error', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
