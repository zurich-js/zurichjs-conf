import type { NextApiRequest } from 'next';
import { getBaseUrl } from '@/lib/url';

const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

/**
 * Local badge previews and QR exports must use the port serving the current app,
 * while deployed exports should continue using the configured canonical or
 * Vercel preview URL.
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
  return getBaseUrl(req);
}
