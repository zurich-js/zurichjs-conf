import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { geolocation } from '@vercel/functions';

const COUNTRY_COOKIE = 'vercel-country';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

/**
 * Edge Middleware for geo-detection
 * Runs on Vercel Edge Network where geolocation is reliably available
 * Sets a cookie with the detected country for use in pages/API routes
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Get geolocation from Vercel Edge (only works on Vercel, not locally)
  const geo = geolocation(request);
  const country = geo?.country;

  if (country) {
    const existingCountry = request.cookies.get(COUNTRY_COOKIE)?.value;

    // Always update the cookie - either country changed or we're refreshing the TTL
    // If country changed, this will update and cause a cache miss on the client
    if (existingCountry !== country) {
      // Country changed - delete any cached currency preference
      response.cookies.delete('preferred-currency');
    }

    // Set/refresh the country cookie
    response.cookies.set(COUNTRY_COOKIE, country, {
      httpOnly: false, // Allow client-side access for currency context
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    // Also set as a response header for server-side access
    response.headers.set('x-detected-country', country);
  }

  return response;
}

// Run middleware on all pages (but not static assets or API routes)
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
