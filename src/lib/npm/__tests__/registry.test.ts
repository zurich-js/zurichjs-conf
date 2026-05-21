import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _internals, getSpeakerNpmImpact } from '@/lib/npm/registry';

describe('npm registry helpers', () => {
  describe('normalizeRepositoryUrl', () => {
    it('returns null when no repository is provided', () => {
      expect(_internals.normalizeRepositoryUrl(undefined)).toBeNull();
      expect(_internals.normalizeRepositoryUrl(null)).toBeNull();
    });

    it('strips git+ prefix and .git suffix', () => {
      expect(
        _internals.normalizeRepositoryUrl({ url: 'git+https://github.com/foo/bar.git' }),
      ).toBe('https://github.com/foo/bar');
    });

    it('handles string-form repository fields', () => {
      expect(_internals.normalizeRepositoryUrl('git://github.com/foo/bar.git')).toBe(
        'https://github.com/foo/bar',
      );
    });
  });

  describe('cacheKey', () => {
    it('is case-insensitive on username and stable across contribution order', () => {
      expect(_internals.cacheKey('TkDodo', ['vite', 'astro'])).toBe(
        _internals.cacheKey('tkdodo', ['astro', 'vite']),
      );
    });
  });

  describe('packageFromSearchObject', () => {
    it('returns null when the search object has no package name', () => {
      expect(
        _internals.packageFromSearchObject({ package: { description: 'no name' } }, true),
      ).toBeNull();
    });

    it('extracts weekly downloads from the search response', () => {
      const impact = _internals.packageFromSearchObject(
        {
          package: {
            name: 'cool-pkg',
            description: '  trims me  ',
            date: '2026-03-01T00:00:00.000Z',
            links: { repository: 'https://github.com/example/cool' },
          },
          downloads: { weekly: 4242, monthly: 16968 },
        },
        true,
      );
      expect(impact).toEqual({
        name: 'cool-pkg',
        description: 'trims me',
        weekly_downloads: 4242,
        repository_url: 'https://github.com/example/cool',
        npm_url: 'https://www.npmjs.com/package/cool-pkg',
        last_publish: '2026-03-01T00:00:00.000Z',
        is_maintained: true,
      });
    });

    it('defaults missing weekly downloads to 0', () => {
      const impact = _internals.packageFromSearchObject(
        { package: { name: 'no-downloads' } },
        false,
      );
      expect(impact?.weekly_downloads).toBe(0);
      expect(impact?.is_maintained).toBe(false);
    });
  });
});

describe('getSpeakerNpmImpact', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }

  it('aggregates maintained packages and weekly downloads from a single search call', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (!url.startsWith('https://registry.npmjs.org/-/v1/search')) {
        throw new Error(`Unexpected fetch: ${url}`);
      }
      return jsonResponse({
        total: 2,
        objects: [
          {
            package: {
              name: 'tiny-pkg',
              description: 'a tiny package',
              date: '2026-01-01T00:00:00.000Z',
              links: { repository: 'https://github.com/example/tiny-pkg' },
            },
            downloads: { weekly: 123456, monthly: 493824 },
          },
          {
            package: {
              name: '@scope/widget',
              description: 'a scoped widget',
              date: '2026-02-01T00:00:00.000Z',
              links: { repository: 'https://github.com/example/widget' },
            },
            downloads: { weekly: 5000, monthly: 20000 },
          },
        ],
      });
    });

    const impact = await getSpeakerNpmImpact({
      speakerSlug: 'jane-doe',
      npmUsername: 'janedoe',
    });

    expect(impact.npm_username).toBe('janedoe');
    expect(impact.packages).toHaveLength(2);
    expect(impact.totals).toEqual({ package_count: 2, weekly_downloads: 128456 });
    expect(impact.packages[0]).toMatchObject({ name: 'tiny-pkg', weekly_downloads: 123456 });
    expect(impact.top_packages[0]?.name).toBe('tiny-pkg');
    expect(impact.is_stale).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('merges contributed packages and de-duplicates against maintained packages', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      const params = new URL(url).searchParams;
      const text = params.get('text') ?? '';

      if (text.startsWith('maintainer:')) {
        return jsonResponse({
          objects: [
            {
              package: { name: 'main-pkg', description: 'maintained', date: null, links: {} },
              downloads: { weekly: 1000 },
            },
          ],
        });
      }
      if (text === 'vite') {
        return jsonResponse({
          objects: [
            { package: { name: 'vite', description: 'next gen frontend tooling' }, downloads: { weekly: 50_000_000 } },
            { package: { name: 'vitest', description: 'testing' }, downloads: { weekly: 10_000_000 } },
          ],
        });
      }
      if (text === 'main-pkg') {
        return jsonResponse({
          objects: [
            { package: { name: 'main-pkg', description: 'maintained' }, downloads: { weekly: 1000 } },
          ],
        });
      }
      return jsonResponse({ objects: [] });
    });

    const impact = await getSpeakerNpmImpact({
      speakerSlug: 'contrib-speaker',
      npmUsername: 'contrib-user',
      contributesTo: ['vite', 'main-pkg'],
    });

    const names = impact.packages.map((entry) => entry.name);
    expect(names).toEqual(['vite', 'main-pkg']);
    expect(impact.packages.find((entry) => entry.name === 'vite')?.is_maintained).toBe(false);
    expect(impact.packages.find((entry) => entry.name === 'main-pkg')?.is_maintained).toBe(true);
    expect(impact.totals.weekly_downloads).toBe(50_001_000);
  });

  it('serves the cached value on subsequent calls with identical inputs', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        objects: [
          { package: { name: 'cached-pkg', description: 'cached' }, downloads: { weekly: 42 } },
        ],
      }),
    );

    const first = await getSpeakerNpmImpact({
      speakerSlug: 'cache-speaker',
      npmUsername: 'cache-user',
    });
    expect(first.totals.weekly_downloads).toBe(42);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockReset();
    const second = await getSpeakerNpmImpact({
      speakerSlug: 'cache-speaker',
      npmUsername: 'cache-user',
    });
    expect(second.totals.weekly_downloads).toBe(42);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
