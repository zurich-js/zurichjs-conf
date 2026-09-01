/**
 * Platform health endpoint — the target for uptime monitoring (1-min pinger)
 * and the first thing to check in an incident.
 *
 * GET /api/health          — cheap: config presence + one trivial Supabase
 *                            read with a 2s timeout. Safe at high frequency.
 * GET /api/health?deep=1   — admin-only: additionally pings Stripe.
 *                            Don't point a pinger at this (rate limits).
 *
 * 200 = healthy, 503 = one or more checks failed (body says which).
 */

import { withApiHandler } from '@/lib/api/handler';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { ErrorCodes, HttpError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { getStripeClient } from '@/lib/stripe/client';

type CheckStatus = 'ok' | 'failed' | 'not_configured';

interface HealthChecks {
  supabase: CheckStatus;
  stripe_key: CheckStatus;
  stripe_webhook_secret: CheckStatus;
  resend_key: CheckStatus;
  posthog_key: CheckStatus;
  stripe_api?: CheckStatus;
}

async function checkSupabase(): Promise<CheckStatus> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    return 'not_configured';
  }
  try {
    const supabase = createServiceRoleClient();
    const probe = supabase.from('tickets').select('id', { head: true, count: 'exact' }).limit(1);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('supabase health probe timed out after 2s')), 2000)
    );
    const { error } = await Promise.race([probe, timeout]);
    return error ? 'failed' : 'ok';
  } catch {
    return 'failed';
  }
}

async function checkStripeApi(): Promise<CheckStatus> {
  try {
    const stripe = getStripeClient();
    await stripe.balance.retrieve();
    return 'ok';
  } catch {
    return 'failed';
  }
}

export default withApiHandler(
  { scope: 'Health API', methods: ['GET'] },
  async (req, res, { log, requestId }) => {
    const deep = req.query.deep === '1';
    if (deep) {
      const { authorized } = verifyAdminAccess(req);
      if (!authorized) {
        throw new HttpError(401, 'Deep health checks require admin access', {
          code: ErrorCodes.AUTH_REQUIRED,
        });
      }
    }

    const presence = (value: string | undefined): CheckStatus =>
      value ? 'ok' : 'not_configured';

    const checks: HealthChecks = {
      supabase: await checkSupabase(),
      stripe_key: presence(process.env.STRIPE_SECRET_KEY),
      stripe_webhook_secret: presence(process.env.STRIPE_WEBHOOK_SECRET),
      resend_key: presence(process.env.RESEND_API_KEY),
      posthog_key: presence(process.env.NEXT_PUBLIC_POSTHOG_KEY),
    };

    if (deep) {
      checks.stripe_api = await checkStripeApi();
    }

    const failed = Object.entries(checks).filter(([, status]) => status !== 'ok');
    const healthy = failed.length === 0;

    if (!healthy) {
      log.error('Health check failing', undefined, {
        severity: 'critical',
        type: 'system',
        fingerprint: 'health-check-failing',
        failedChecks: Object.fromEntries(failed),
      });
    }

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      checks,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
);
