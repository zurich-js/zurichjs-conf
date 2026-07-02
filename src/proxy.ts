/**
 * Next.js Proxy (formerly middleware)
 *
 * Two responsibilities, both edge-resident:
 * 1. Enforce read-only access for API-key-authenticated bot requests on
 *    `/api/admin/*` — blocks non-GET and dangerous paths.
 * 2. Content negotiation for AI agents — rewrites allowlisted public pages
 *    to `/api/agent/<path>` when the client prefers `text/markdown`, so the
 *    catch-all can render markdown directly from typed data (no HTML→md
 *    conversion).
 *
 * Tracking for (2) happens in the catch-all (Node runtime), not here, since
 * the edge runtime can't load the PostHog Node SDK.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { prefersMarkdown } from '@/lib/markdown-for-agents/content-negotiation';
import { isAgentReadyPath } from '@/lib/markdown-for-agents/resources';

const BLOCKED_BOT_PATHS = ['/api/admin/login', '/api/admin/logout'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/admin')) {
    return enforceAdminBotAccess(request, pathname);
  }

  if (isAgentReadyPath(pathname) && prefersMarkdown(request.headers.get('accept'))) {
    const url = request.nextUrl.clone();
    url.pathname = `/api/agent${pathname.replace(/\/$/, '')}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

function enforceAdminBotAccess(request: NextRequest, pathname: string) {
  const authHeader = request.headers.get('authorization');
  const isBotRequest = authHeader?.startsWith('Bearer ');

  if (!isBotRequest) {
    return NextResponse.next();
  }

  if (request.method !== 'GET') {
    return NextResponse.json(
      { error: 'Read-only access: only GET requests are allowed with API key authentication' },
      { status: 403 }
    );
  }

  if (BLOCKED_BOT_PATHS.some((p) => pathname === p)) {
    return NextResponse.json(
      { error: 'This endpoint is not available for bot access' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/admin/:path*',
    '/schedule',
    '/schedule/',
    '/speakers',
    '/speakers/',
    '/speakers/:slug',
    '/talks',
    '/talks/',
    '/talks/:slug',
  ],
};
