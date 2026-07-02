import { describe, expect, it } from 'vitest';
import { prefersMarkdown } from '../content-negotiation';

describe('prefersMarkdown', () => {
  it('returns false for null or empty headers', () => {
    expect(prefersMarkdown(null)).toBe(false);
    expect(prefersMarkdown(undefined)).toBe(false);
    expect(prefersMarkdown('')).toBe(false);
  });

  it('returns true when only markdown is requested', () => {
    expect(prefersMarkdown('text/markdown')).toBe(true);
  });

  it('returns true when markdown and html have equal q (Cloudflare-style tie-break)', () => {
    expect(prefersMarkdown('text/markdown, text/html')).toBe(true);
  });

  it('returns false when html is preferred over markdown', () => {
    expect(prefersMarkdown('text/html, text/markdown;q=0.5')).toBe(false);
  });

  it('returns true when markdown q is higher than html q', () => {
    expect(prefersMarkdown('text/markdown;q=0.9, text/html;q=0.5')).toBe(true);
  });

  it('ignores unrelated media types', () => {
    expect(prefersMarkdown('application/json, image/png')).toBe(false);
  });

  it('handles browser default Accept header', () => {
    const ua = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,*/*;q=0.8';
    expect(prefersMarkdown(ua)).toBe(false);
  });

  it('matches case-insensitively', () => {
    expect(prefersMarkdown('TEXT/MARKDOWN')).toBe(true);
  });
});
