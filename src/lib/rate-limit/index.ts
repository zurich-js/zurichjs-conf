/**
 * In-Memory Rate Limiter
 *
 * A simple, reusable rate limiter for API routes.
 * Uses sliding window algorithm with automatic cleanup.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
 *   const { allowed, remaining, resetAt } = limiter.check(ip);
 */

interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** How often to clean up expired entries (ms). Default: 60000 */
  cleanupIntervalMs?: number;
}

interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Unix timestamp when the limit resets */
  resetAt: number;
  /** Current request count */
  current: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

/**
 * Create a rate limiter instance
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests, cleanupIntervalMs = 60_000 } = config;
  const entries = new Map<string, RateLimitEntry>();

  // Periodic cleanup of expired entries
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of entries.entries()) {
      if (now - entry.windowStart > windowMs) {
        entries.delete(key);
      }
    }
  }, cleanupIntervalMs);

  // Allow cleanup interval to be garbage collected
  if (typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }

  return {
    /**
     * Check if a request is allowed for the given identifier (typically IP)
     */
    check(identifier: string): RateLimitResult {
      const now = Date.now();
      const entry = entries.get(identifier);

      // No existing entry or expired window
      if (!entry || now - entry.windowStart > windowMs) {
        entries.set(identifier, { count: 1, windowStart: now });
        return {
          allowed: true,
          remaining: maxRequests - 1,
          resetAt: now + windowMs,
          current: 1,
        };
      }

      // Within current window
      const resetAt = entry.windowStart + windowMs;

      if (entry.count >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetAt,
          current: entry.count,
        };
      }

      entry.count += 1;
      return {
        allowed: true,
        remaining: maxRequests - entry.count,
        resetAt,
        current: entry.count,
      };
    },

    /**
     * Reset the rate limit for an identifier
     */
    reset(identifier: string): void {
      entries.delete(identifier);
    },

    /**
     * Get current stats for an identifier (without incrementing)
     */
    peek(identifier: string): RateLimitResult | null {
      const now = Date.now();
      const entry = entries.get(identifier);

      if (!entry || now - entry.windowStart > windowMs) {
        return null;
      }

      return {
        allowed: entry.count < maxRequests,
        remaining: Math.max(0, maxRequests - entry.count),
        resetAt: entry.windowStart + windowMs,
        current: entry.count,
      };
    },

    /**
     * Clean up resources (call when shutting down)
     */
    destroy(): void {
      clearInterval(cleanupInterval);
      entries.clear();
    },
  };
}

/**
 * Extract client IP from Next.js request
 */
export function getClientIp(req: { headers: { [key: string]: string | string[] | undefined }; socket?: { remoteAddress?: string } }): string {
  // Check common proxy headers
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ip.trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fallback to socket address
  return req.socket?.remoteAddress || 'unknown';
}

export type { RateLimitConfig, RateLimitResult };
