/**
 * Which database is this deployment actually talking to?
 * GET /api/admin/which-database
 *
 * WHY THIS EXISTS
 * With Supabase branching, every preview deployment is supposed to be bound to
 * its OWN branch database. When that goes wrong it does not announce itself: the
 * app starts fine, most pages render, and the first symptom is a query failing
 * against a table that exists on the branch but not on production — or worse,
 * a write landing in production while someone believes they are testing.
 *
 * That question — "which database am I on?" — took a chain of inference to answer
 * from a 500 and a log line. This answers it directly.
 *
 * Admin-gated even though it returns nothing secret: the project ref is already
 * public in NEXT_PUBLIC_SUPABASE_URL, and no key or key fragment is returned. The
 * gate is there so it is not a free fingerprint of the deployment.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';

interface DatabaseBinding {
  /** Supabase project ref — the subdomain of the API URL. This is the answer. */
  supabaseProjectRef: string | null;
  supabaseUrl: string | null;
  /**
   * WHICH VARIABLE NAME supplied the service key.
   *
   * The Supabase/Vercel integration writes SUPABASE_SERVICE_ROLE_KEY; this app
   * asks for SUPABASE_SECRET_KEY. Seeing which one answered tells you whether
   * the integration's values reached this build at all — the exact failure that
   * silently pointed a preview at production.
   */
  serviceKeySource: 'SUPABASE_SECRET_KEY' | 'SUPABASE_SERVICE_ROLE_KEY' | null;
  publishableKeySource:
    | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    | null;
  /** 'production' | 'preview' | 'development', or null off Vercel. */
  vercelEnv: string | null;
  /** The deployment's own host, which a preview must use as its base URL. */
  vercelUrl: string | null;
  /** What the app will actually build links and QR payloads with. */
  baseUrl: string | null;
  gitBranch: string | null;
  gitCommitSha: string | null;
}

/** The ref is the first label of the Supabase API host. */
function projectRefFrom(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const [ref] = host.split('.');
    return ref || null;
  } catch {
    return null;
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Read every value through a static reference: Next.js inlines NEXT_PUBLIC_*
  // at BUILD time, so what this reports is what the build was given — which is
  // precisely the thing in question.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;

  const binding: DatabaseBinding = {
    supabaseProjectRef: projectRefFrom(supabaseUrl ?? undefined),
    supabaseUrl,
    serviceKeySource: process.env.SUPABASE_SECRET_KEY
      ? 'SUPABASE_SECRET_KEY'
      : process.env.SUPABASE_SERVICE_ROLE_KEY
        ? 'SUPABASE_SERVICE_ROLE_KEY'
        : null,
    publishableKeySource: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
        : null,
    vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? null,
    vercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL ?? null,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL ?? null,
    gitBranch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  };

  // Never cached: the whole point is what THIS deployment is bound to.
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json(binding);
}
