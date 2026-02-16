/**
 * Unit Tests for Social Handle URL Parsing
 *
 * Tests extractHandle (display-side extraction) and
 * normalizeHandle/normalizeGithubUrl/normalizeLinkedinUrl (validation-side normalization)
 */

import { describe, it, expect } from 'vitest';
import { extractHandle } from '@/components/cfp/profile/SocialLinksCard';
import {
  normalizeHandle,
  normalizeGithubUrl,
  normalizeLinkedinUrl,
} from '../cfp';

// ============================================
// extractHandle — used for displaying values in inputs
// ============================================

describe('extractHandle', () => {
  describe('empty/null values', () => {
    it('returns empty string for empty input', () => {
      expect(extractHandle('', [])).toBe('');
    });

    it('returns empty string for whitespace-only input', () => {
      expect(extractHandle('   ', [])).toBe('');
    });
  });

  describe('GitHub URLs', () => {
    const prefixes = ['https://github.com/'];

    it('extracts handle from full URL', () => {
      expect(extractHandle('https://github.com/myhandle', prefixes)).toBe('myhandle');
    });

    it('extracts handle from www URL', () => {
      expect(extractHandle('https://www.github.com/myhandle', prefixes)).toBe('myhandle');
    });

    it('strips trailing slashes', () => {
      expect(extractHandle('https://github.com/myhandle/', prefixes)).toBe('myhandle');
      expect(extractHandle('https://github.com/myhandle///', prefixes)).toBe('myhandle');
    });

    it('passes through plain handle', () => {
      expect(extractHandle('myhandle', prefixes)).toBe('myhandle');
    });

    it('strips leading @ from handle', () => {
      expect(extractHandle('@myhandle', prefixes)).toBe('myhandle');
    });

    it('handles handle with hyphens and dots', () => {
      expect(extractHandle('https://github.com/my-handle.123', prefixes)).toBe('my-handle.123');
    });
  });

  describe('LinkedIn URLs', () => {
    const prefixes = ['https://linkedin.com/in/'];

    it('extracts handle from full URL', () => {
      expect(extractHandle('https://linkedin.com/in/myhandle', prefixes)).toBe('myhandle');
    });

    it('extracts handle from www URL', () => {
      expect(extractHandle('https://www.linkedin.com/in/myhandle', prefixes)).toBe('myhandle');
    });

    it('strips trailing slashes', () => {
      expect(extractHandle('https://linkedin.com/in/myhandle/', prefixes)).toBe('myhandle');
    });

    it('passes through plain handle', () => {
      expect(extractHandle('myhandle', prefixes)).toBe('myhandle');
    });
  });

  describe('X/Twitter URLs', () => {
    const prefixes = ['https://x.com/', 'https://twitter.com/'];

    it('extracts handle from x.com URL', () => {
      expect(extractHandle('https://x.com/danieljcafonsc', prefixes)).toBe('danieljcafonsc');
    });

    it('extracts handle from twitter.com URL', () => {
      expect(extractHandle('https://twitter.com/danieljcafonsc', prefixes)).toBe('danieljcafonsc');
    });

    it('extracts handle from www x.com URL', () => {
      expect(extractHandle('https://www.x.com/danieljcafonsc', prefixes)).toBe('danieljcafonsc');
    });

    it('handles stored value with @ prefix and full URL (the broken case)', () => {
      expect(extractHandle('@https://x.com/danieljcafonsc', prefixes)).toBe('danieljcafonsc');
    });

    it('handles double @@ prefix with URL', () => {
      expect(extractHandle('@@https://x.com/user', prefixes)).toBe('user');
    });

    it('strips leading @ from plain handle', () => {
      expect(extractHandle('@myhandle', prefixes)).toBe('myhandle');
    });

    it('passes through plain handle', () => {
      expect(extractHandle('myhandle', prefixes)).toBe('myhandle');
    });

    it('strips trailing slashes from URL', () => {
      expect(extractHandle('https://x.com/user/', prefixes)).toBe('user');
    });
  });

  describe('Bluesky URLs', () => {
    const prefixes = ['https://bsky.app/profile/'];

    it('extracts handle from full URL', () => {
      expect(extractHandle('https://bsky.app/profile/user.bsky.social', prefixes)).toBe('user.bsky.social');
    });

    it('handles stored value with @ prefix and full URL (the broken case)', () => {
      expect(extractHandle('@https://bsky.app/profile/dani', prefixes)).toBe('dani');
    });

    it('extracts from www URL', () => {
      expect(extractHandle('https://www.bsky.app/profile/user', prefixes)).toBe('user');
    });

    it('strips leading @ from plain handle', () => {
      expect(extractHandle('@user.bsky.social', prefixes)).toBe('user.bsky.social');
    });

    it('passes through plain handle', () => {
      expect(extractHandle('user.bsky.social', prefixes)).toBe('user.bsky.social');
    });

    it('strips trailing slashes', () => {
      expect(extractHandle('https://bsky.app/profile/user/', prefixes)).toBe('user');
    });
  });

  describe('Mastodon URLs (generic URL fallback)', () => {
    const prefixes: string[] = []; // No known prefixes since instances vary

    it('extracts username from mastodon.social URL', () => {
      expect(extractHandle('https://mastodon.social/@username', prefixes)).toBe('username');
    });

    it('extracts username from hachyderm.io URL', () => {
      expect(extractHandle('https://hachyderm.io/@user', prefixes)).toBe('user');
    });

    it('handles stored value with @ prefix and mastodon URL', () => {
      expect(extractHandle('@https://mastodon.social/@user', prefixes)).toBe('user');
    });

    it('strips leading @ from user@instance handle', () => {
      expect(extractHandle('@user@mastodon.social', prefixes)).toBe('user@mastodon.social');
    });

    it('passes through user@instance handle', () => {
      expect(extractHandle('user@mastodon.social', prefixes)).toBe('user@mastodon.social');
    });

    it('passes through plain handle', () => {
      expect(extractHandle('myhandle', prefixes)).toBe('myhandle');
    });
  });

  describe('edge cases', () => {
    it('handles http (not https) URLs', () => {
      expect(extractHandle('http://github.com/user', ['https://github.com/'])).toBe('user');
    });

    it('handles URL with @ in path (mastodon-style) via fallback', () => {
      expect(extractHandle('https://fosstodon.org/@user', [])).toBe('user');
    });

    it('trims whitespace', () => {
      expect(extractHandle('  myhandle  ', [])).toBe('myhandle');
      expect(extractHandle('  https://github.com/user  ', ['https://github.com/'])).toBe('user');
    });

    it('handles multiple @ prefixes', () => {
      expect(extractHandle('@@@handle', [])).toBe('handle');
    });
  });
});

// ============================================
// normalizeHandle — validation transform for X, Bluesky, Mastodon
// ============================================

describe('normalizeHandle', () => {
  describe('empty/undefined values', () => {
    it('returns empty string for undefined', () => {
      expect(normalizeHandle(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(normalizeHandle('')).toBe('');
    });

    it('returns empty string for whitespace', () => {
      expect(normalizeHandle('   ')).toBe('');
    });
  });

  describe('plain handles', () => {
    it('adds @ prefix to plain handle', () => {
      expect(normalizeHandle('myhandle')).toBe('@myhandle');
    });

    it('preserves existing @ prefix (no doubling)', () => {
      expect(normalizeHandle('@myhandle')).toBe('@myhandle');
    });

    it('strips multiple leading @ symbols', () => {
      expect(normalizeHandle('@@myhandle')).toBe('@myhandle');
      expect(normalizeHandle('@@@myhandle')).toBe('@myhandle');
    });

    it('trims whitespace', () => {
      expect(normalizeHandle('  myhandle  ')).toBe('@myhandle');
    });
  });

  describe('X/Twitter URL normalization', () => {
    it('extracts handle from x.com URL', () => {
      expect(normalizeHandle('https://x.com/danieljcafonsc')).toBe('@danieljcafonsc');
    });

    it('extracts handle from twitter.com URL', () => {
      expect(normalizeHandle('https://twitter.com/myuser')).toBe('@myuser');
    });

    it('extracts handle from www x.com URL', () => {
      expect(normalizeHandle('https://www.x.com/user')).toBe('@user');
    });

    it('extracts handle from www twitter.com URL', () => {
      expect(normalizeHandle('https://www.twitter.com/user')).toBe('@user');
    });

    it('handles http (not https)', () => {
      expect(normalizeHandle('http://x.com/user')).toBe('@user');
    });

    it('handles @ prefix before URL (the broken stored case)', () => {
      expect(normalizeHandle('@https://x.com/danieljcafonsc')).toBe('@danieljcafonsc');
    });

    it('strips trailing slashes from URL', () => {
      expect(normalizeHandle('https://x.com/user/')).toBe('@user');
    });
  });

  describe('Bluesky URL normalization', () => {
    it('extracts handle from bsky.app URL', () => {
      expect(normalizeHandle('https://bsky.app/profile/user.bsky.social')).toBe('@user.bsky.social');
    });

    it('extracts handle from www bsky.app URL', () => {
      expect(normalizeHandle('https://www.bsky.app/profile/user')).toBe('@user');
    });

    it('handles @ prefix before URL', () => {
      expect(normalizeHandle('@https://bsky.app/profile/dani')).toBe('@dani');
    });

    it('strips trailing slashes', () => {
      expect(normalizeHandle('https://bsky.app/profile/user/')).toBe('@user');
    });
  });

  describe('Mastodon URL normalization', () => {
    it('extracts user@instance from mastodon.social URL', () => {
      expect(normalizeHandle('https://mastodon.social/@username')).toBe('@username@mastodon.social');
    });

    it('extracts user@instance from hachyderm.io URL', () => {
      expect(normalizeHandle('https://hachyderm.io/@user')).toBe('@user@hachyderm.io');
    });

    it('extracts from URL without @ in path', () => {
      expect(normalizeHandle('https://fosstodon.org/@devuser')).toBe('@devuser@fosstodon.org');
    });

    it('handles @ prefix before mastodon URL', () => {
      expect(normalizeHandle('@https://mastodon.social/@user')).toBe('@user@mastodon.social');
    });

    it('preserves user@instance format', () => {
      expect(normalizeHandle('user@mastodon.social')).toBe('@user@mastodon.social');
    });

    it('preserves @user@instance format', () => {
      expect(normalizeHandle('@user@mastodon.social')).toBe('@user@mastodon.social');
    });
  });

  describe('edge cases', () => {
    it('handles handle with dots', () => {
      expect(normalizeHandle('user.name')).toBe('@user.name');
    });

    it('handles handle with hyphens', () => {
      expect(normalizeHandle('my-handle')).toBe('@my-handle');
    });

    it('handles handle with underscores', () => {
      expect(normalizeHandle('my_handle')).toBe('@my_handle');
    });
  });
});

// ============================================
// normalizeGithubUrl — validation transform for GitHub
// ============================================

describe('normalizeGithubUrl', () => {
  describe('empty/undefined values', () => {
    it('returns empty string for undefined', () => {
      expect(normalizeGithubUrl(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(normalizeGithubUrl('')).toBe('');
    });

    it('returns empty string for whitespace', () => {
      expect(normalizeGithubUrl('   ')).toBe('');
    });
  });

  describe('handle to URL conversion', () => {
    it('converts plain handle to full URL', () => {
      expect(normalizeGithubUrl('myhandle')).toBe('https://github.com/myhandle');
    });

    it('strips leading @ from handle', () => {
      expect(normalizeGithubUrl('@myhandle')).toBe('https://github.com/myhandle');
    });

    it('strips leading / from handle', () => {
      expect(normalizeGithubUrl('/myhandle')).toBe('https://github.com/myhandle');
    });
  });

  describe('URL passthrough', () => {
    it('passes through full https URL', () => {
      expect(normalizeGithubUrl('https://github.com/myhandle')).toBe('https://github.com/myhandle');
    });

    it('passes through http URL', () => {
      expect(normalizeGithubUrl('http://github.com/myhandle')).toBe('http://github.com/myhandle');
    });
  });
});

// ============================================
// normalizeLinkedinUrl — validation transform for LinkedIn
// ============================================

describe('normalizeLinkedinUrl', () => {
  describe('empty/undefined values', () => {
    it('returns empty string for undefined', () => {
      expect(normalizeLinkedinUrl(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(normalizeLinkedinUrl('')).toBe('');
    });

    it('returns empty string for whitespace', () => {
      expect(normalizeLinkedinUrl('   ')).toBe('');
    });
  });

  describe('handle to URL conversion', () => {
    it('converts plain handle to full URL', () => {
      expect(normalizeLinkedinUrl('myhandle')).toBe('https://linkedin.com/in/myhandle');
    });

    it('strips leading @ from handle', () => {
      expect(normalizeLinkedinUrl('@myhandle')).toBe('https://linkedin.com/in/myhandle');
    });

    it('strips leading / from handle', () => {
      expect(normalizeLinkedinUrl('/myhandle')).toBe('https://linkedin.com/in/myhandle');
    });
  });

  describe('URL passthrough', () => {
    it('passes through full https URL', () => {
      expect(normalizeLinkedinUrl('https://linkedin.com/in/myhandle')).toBe('https://linkedin.com/in/myhandle');
    });

    it('passes through http URL', () => {
      expect(normalizeLinkedinUrl('http://linkedin.com/in/myhandle')).toBe('http://linkedin.com/in/myhandle');
    });
  });
});
