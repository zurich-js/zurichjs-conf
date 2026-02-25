/**
 * Next.js Middleware
 *
 * Enforces read-only access for API-key-authenticated bot requests:
 * - Blocks non-GET methods on /api/admin/* when using Bearer token auth
 * - Blocks dangerous admin paths (logout, login) for bots
 * - Passes through all cookie-authenticated (human) requests unchanged
 */

import { NextResponse, type NextRequest } from 'next/server';

/** Admin paths that bots must never access (even via GET) */
const BLOCKED_BOT_PATHS = [
  '/api/admin/login',
  '/api/admin/logout',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to admin API routes
  if (!pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  const isBotRequest = authHeader?.startsWith('Bearer ');

  if (!isBotRequest) {
    // Cookie-based human request — pass through
    return NextResponse.next();
  }

  // --- Bot request enforcement ---

  // Block non-GET methods at the edge (defense-in-depth, bot-auth.ts also blocks)
  if (request.method !== 'GET') {
    return NextResponse.json(
      { error: 'Read-only access: only GET requests are allowed with API key authentication' },
      { status: 403 }
    );
  }

  // Block dangerous paths even for GET
  if (BLOCKED_BOT_PATHS.some((p) => pathname === p)) {
    return NextResponse.json(
      { error: 'This endpoint is not available for bot access' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/admin/:path*',
};
