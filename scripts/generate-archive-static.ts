/**
 * Build-time generator for the archive's XML files.
 *
 * `/sitemap.xml` and `/blog/feed.xml` were server-rendered pages on the live
 * site. A static export has no server, so they are written into `public/` as
 * flat files before `next build` runs — same URLs, no runtime.
 *
 * Wired into `prebuild`. Run standalone with: pnpm archive:static
 */

import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { getAllPosts } from '@/lib/blog';
import { getAuthor } from '@/lib/blog/authors';
import { getAllPageSlugs } from '@/data/info-pages';
import { getFrozenSpeakers } from '@/lib/archive/frozen';
import { ARCHIVE_BASE_URL } from '@/lib/archive/config';

const PUBLIC_DIR = path.join(process.cwd(), 'public');

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Static routes that survive into the archive. Transactional routes (cart,
 * checkout, CFP, admin, check-in) are gone and must not be advertised.
 */
const STATIC_ROUTES = [
  '',
  '/about',
  '/faq',
  '/speakers',
  '/talks',
  '/schedule',
  '/workshops',
  '/blog',
  '/attendee-info',
  '/convince-your-boss',
] as const;

function buildSitemap(): string {
  const { speakers } = getFrozenSpeakers();

  const sessions = new Map<string, 'talks' | 'workshops'>();
  for (const speaker of speakers) {
    for (const session of speaker.sessions) {
      sessions.set(session.slug, session.type === 'workshop' ? 'workshops' : 'talks');
    }
  }

  const locs = [
    ...STATIC_ROUTES.map((route) => `${ARCHIVE_BASE_URL}${route}`),
    ...getAllPageSlugs().map((slug) => `${ARCHIVE_BASE_URL}/info/${slug}`),
    ...getAllPosts().map((post) => `${ARCHIVE_BASE_URL}/blog/${post.slug}`),
    ...speakers.map((speaker) => `${ARCHIVE_BASE_URL}/speakers/${speaker.slug}`),
    ...[...sessions].map(([slug, kind]) => `${ARCHIVE_BASE_URL}/${kind}/${slug}`),
  ];

  // The archive never changes, so every entry shares one lastmod and a
  // changefreq that tells crawlers not to come back looking for updates.
  const urls = locs
    .map(
      (loc) => `  <url>
    <loc>${escapeXml(loc)}</loc>
    <changefreq>never</changefreq>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function buildFeed(): string {
  const posts = getAllPosts();
  const toRfc822 = (value: string) => new Date(value).toUTCString();
  const lastBuildDate =
    posts.length > 0 ? toRfc822(posts[0].frontmatter.date) : new Date(0).toUTCString();

  const items = posts
    .map((post) => {
      const author = getAuthor(post.frontmatter.author);
      const url = `${ARCHIVE_BASE_URL}/blog/${post.slug}`;

      return `    <item>
      <title>${escapeXml(post.frontmatter.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${toRfc822(post.frontmatter.date)}</pubDate>
      <dc:creator>${escapeXml(author.name)}</dc:creator>
      <description><![CDATA[${post.frontmatter.excerpt}]]></description>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>ZurichJS Conf 2026 Blog (archived)</title>
    <link>${ARCHIVE_BASE_URL}/blog</link>
    <description>Archived news, announcements, and articles from ZurichJS Conf 2026.</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${ARCHIVE_BASE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

const exists = (target: string) =>
  access(target).then(
    () => true,
    () => false
  );

/**
 * Each generated file shadows a route that is still served by a page today.
 * Next.js refuses to build when a file in `public/` collides with a page
 * ("Conflicting public and page files"), so generating ahead of the page's
 * removal breaks the build outright.
 *
 * Rather than half-apply, wait for the page to go: skip that file, and clear
 * any copy an earlier run left behind so a stale artifact cannot cause the very
 * collision this guard exists to prevent.
 */
const OUTPUTS = [
  {
    generate: buildSitemap,
    publicFile: path.join(PUBLIC_DIR, 'sitemap.xml'),
    supersedes: path.join(process.cwd(), 'src', 'pages', 'sitemap.xml.tsx'),
    label: 'sitemap.xml',
  },
  {
    generate: buildFeed,
    publicFile: path.join(PUBLIC_DIR, 'blog', 'feed.xml'),
    supersedes: path.join(process.cwd(), 'src', 'pages', 'blog', 'feed.xml.tsx'),
    label: 'blog/feed.xml',
  },
] as const;

async function main(): Promise<void> {
  await mkdir(path.join(PUBLIC_DIR, 'blog'), { recursive: true });

  const written: string[] = [];
  const skipped: string[] = [];

  for (const output of OUTPUTS) {
    if (await exists(output.supersedes)) {
      await rm(output.publicFile, { force: true });
      skipped.push(output.label);
      continue;
    }

    await writeFile(output.publicFile, output.generate());
    written.push(output.label);
  }

  if (written.length > 0) {
    console.log(`[archive:static] wrote ${written.map((f) => `public/${f}`).join(', ')}`);
  }

  if (skipped.length > 0) {
    console.warn(
      `[archive:static] skipped ${skipped.join(', ')} — still served by a page. ` +
        'Delete the corresponding src/pages/*.xml.tsx to switch these routes to static files.'
    );
  }
}

main().catch((error) => {
  console.error('[archive:static] failed:', error);
  process.exit(1);
});
