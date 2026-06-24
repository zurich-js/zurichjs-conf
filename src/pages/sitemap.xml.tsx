/**
 * Dynamic XML Sitemap Generator
 * Generates sitemap.xml for search engine crawlers
 */

import { GetServerSideProps } from 'next';
import { getAllPageSlugs } from '@/data/info-pages';
import { getAllPosts } from '@/lib/blog';
import { getVisibleSpeakersWithSessions } from '@/lib/cfp/speakers';

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
}

const escapeXml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const generateSitemap = async (baseUrl: string): Promise<string> => {
  const infoSlugs = getAllPageSlugs();
  const blogPosts = getAllPosts();
  const speakers = await getVisibleSpeakersWithSessions().catch(() => []);
  const currentDate = new Date().toISOString().split('T')[0];

  // Define all pages with their SEO properties
  const pages: SitemapUrl[] = [
    // Homepage - highest priority
    {
      loc: baseUrl,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: '1.0',
    },
    // Main content pages
    {
      loc: `${baseUrl}/about`,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: '0.8',
    },
    // CFP and Sponsorship - important indexable pages
    {
      loc: `${baseUrl}/cfp`,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: '0.7',
    },
    {
      loc: `${baseUrl}/sponsorship`,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: '0.7',
    },
    // Contact page
    {
      loc: `${baseUrl}/contact`,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: '0.6',
    },
    // Blog index
    {
      loc: `${baseUrl}/blog`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: '0.8',
    },
    // Blog posts
    ...blogPosts.map((post) => ({
      loc: `${baseUrl}/blog/${post.slug}`,
      lastmod: post.frontmatter.date,
      changefreq: 'monthly' as const,
      priority: '0.7',
    })),
    // Info pages (terms, privacy, refund, code of conduct)
    ...infoSlugs.map((slug) => ({
      loc: `${baseUrl}/info/${slug}`,
      lastmod: currentDate,
      changefreq: 'monthly' as const,
      priority: '0.6',
    })),
    // Speakers index + individual profiles
    {
      loc: `${baseUrl}/speakers`,
      lastmod: currentDate,
      changefreq: 'weekly' as const,
      priority: '0.8',
    },
    ...speakers.map((speaker) => ({
      loc: `${baseUrl}/speakers/${speaker.slug}`,
      lastmod: speaker.updated_at?.slice(0, 10) ?? currentDate,
      changefreq: 'weekly' as const,
      priority: '0.7',
    })),
  ];

  // Generate XML
  const urlElements = pages
    .map(
      (page) => `  <url>
    <loc>${escapeXml(page.loc)}</loc>
    <lastmod>${escapeXml(page.lastmod)}</lastmod>
    <changefreq>${escapeXml(page.changefreq)}</changefreq>
    <priority>${escapeXml(page.priority)}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urlElements}
</urlset>`;
};

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://conf.zurichjs.com';
  const sitemap = await generateSitemap(baseUrl);

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
  res.write(sitemap);
  res.end();

  return { props: {} };
};

// Component is required but not rendered
export default function Sitemap(): null {
  return null;
}
