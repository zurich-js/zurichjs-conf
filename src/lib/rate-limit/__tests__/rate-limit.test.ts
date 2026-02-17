import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter, getClientIp } from '../index';

describe('createRateLimiter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests within the limit', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 3 });
    const r1 = limiter.check('ip-1');
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r1.current).toBe(1);

    const r2 = limiter.check('ip-1');
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);
    expect(r2.current).toBe(2);

    const r3 = limiter.check('ip-1');
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
    expect(r3.current).toBe(3);

    limiter.destroy();
  });

  it('blocks requests over the limit', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2 });
    limiter.check('ip-1');
    limiter.check('ip-1');

    const r3 = limiter.check('ip-1');
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
    expect(r3.current).toBe(2);

    limiter.destroy();
  });

  it('tracks different identifiers independently', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });
    const r1 = limiter.check('ip-1');
    expect(r1.allowed).toBe(true);

    const r2 = limiter.check('ip-2');
    expect(r2.allowed).toBe(true);

    // ip-1 should now be blocked
    expect(limiter.check('ip-1').allowed).toBe(false);
    // ip-2 should also be blocked
    expect(limiter.check('ip-2').allowed).toBe(false);

    limiter.destroy();
  });

  it('resets the window after expiry', () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 1, cleanupIntervalMs: 100_000 });

    limiter.check('ip-1');
    expect(limiter.check('ip-1').allowed).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(1001);

    const result = limiter.check('ip-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.current).toBe(1);

    limiter.destroy();
  });

  it('provides correct resetAt timestamp', () => {
    vi.useFakeTimers({ now: 1000 });
    const limiter = createRateLimiter({ windowMs: 5000, maxRequests: 10, cleanupIntervalMs: 100_000 });

    const result = limiter.check('ip-1');
    expect(result.resetAt).toBe(6000); // 1000 + 5000

    limiter.destroy();
  });

  describe('reset()', () => {
    it('clears rate limit for a specific identifier', () => {
      const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });
      limiter.check('ip-1');
      expect(limiter.check('ip-1').allowed).toBe(false);

      limiter.reset('ip-1');
      expect(limiter.check('ip-1').allowed).toBe(true);

      limiter.destroy();
    });
  });

  describe('peek()', () => {
    it('returns null for unknown identifier', () => {
      const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });
      expect(limiter.peek('unknown')).toBeNull();
      limiter.destroy();
    });

    it('returns current state without incrementing', () => {
      const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });
      limiter.check('ip-1');
      limiter.check('ip-1');

      const peeked = limiter.peek('ip-1');
      expect(peeked).not.toBeNull();
      expect(peeked!.current).toBe(2);
      expect(peeked!.allowed).toBe(true);
      expect(peeked!.remaining).toBe(3);

      // Peek again — count should not have changed
      expect(limiter.peek('ip-1')!.current).toBe(2);

      limiter.destroy();
    });

    it('returns null for expired entries', () => {
      vi.useFakeTimers();
      const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 5, cleanupIntervalMs: 100_000 });
      limiter.check('ip-1');

      vi.advanceTimersByTime(1001);
      expect(limiter.peek('ip-1')).toBeNull();

      limiter.destroy();
    });
  });

  describe('destroy()', () => {
    it('clears all entries', () => {
      const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });
      limiter.check('ip-1');
      limiter.check('ip-2');
      limiter.destroy();

      // After destroy, peek returns null (entries cleared)
      expect(limiter.peek('ip-1')).toBeNull();
      expect(limiter.peek('ip-2')).toBeNull();
    });
  });
});

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const req = { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } };
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('handles x-forwarded-for as array', () => {
    const req = { headers: { 'x-forwarded-for': ['1.2.3.4', '5.6.7.8'] } };
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('extracts IP from x-real-ip header', () => {
    const req = { headers: { 'x-real-ip': '10.0.0.1' } };
    expect(getClientIp(req)).toBe('10.0.0.1');
  });

  it('falls back to socket remoteAddress', () => {
    const req = { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    expect(getClientIp(req)).toBe('127.0.0.1');
  });

  it('returns "unknown" when no IP can be determined', () => {
    const req = { headers: {} };
    expect(getClientIp(req)).toBe('unknown');
  });

  it('trims whitespace from forwarded IP', () => {
    const req = { headers: { 'x-forwarded-for': '  1.2.3.4 , 5.6.7.8' } };
    expect(getClientIp(req)).toBe('1.2.3.4');
  });
});
