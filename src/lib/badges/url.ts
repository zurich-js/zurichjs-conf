import type { NextApiRequest } from 'next';

const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;
const DEFAULT_PUBLIC_BADGE_BASE_URL = 'https://conf.zurichjs.com';

/**
 * Local badge previews use the port serving the current app. Deployed badge
 * exports always encode the canonical public site, even when the admin page is
 * running on a Vercel preview deployment.
 */
export function getBadgeBaseUrl(req: NextApiRequest): string {
  const host = req.headers?.host;
  if (host && LOCAL_HOST_PATTERN.test(host)) {
    const forwardedProtocol = req.headers?.['x-forwarded-proto'];
    const protocolValue = Array.isArray(forwardedProtocol)
      ? forwardedProtocol[0]
      : forwardedProtocol?.split(',')[0].trim();
    const protocol = protocolValue === 'https' ? 'https' : 'http';
    return `${protocol}://${host}`;
  }
  return process.env.NEXT_PUBLIC_BASE_URL?.trim() || DEFAULT_PUBLIC_BADGE_BASE_URL;
}
