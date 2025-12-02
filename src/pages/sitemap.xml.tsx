/**
 * Dynamic XML Sitemap Generator
 * Generates sitemap.xml for search engine crawlers
 */

import { GetServerSideProps } from 'next';
import { getAllPageSlugs } from '@/data/info-pages';

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
}

const generateSitemap = (baseUrl: string): string => {
  const infoSlugs = getAllPageSlugs();
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
    {
      loc: `${baseUrl}/speakers`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: '0.9',
    },
    {
      loc: `${baseUrl}/venue`,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: '0.8',
    },
    {
      loc: `${baseUrl}/workshops`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: '0.8',
    },
    // Info pages (terms, privacy, refund, code of conduct)
    ...infoSlugs.map((slug) => ({
      loc: `${baseUrl}/info/${slug}`,
      lastmod: currentDate,
      changefreq: 'monthly' as const,
      priority: '0.6',
    })),
  ];

  // Generate XML
  const urlElements = pages
    .map(
      (page) => `  <url>
    <loc>${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
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
  const sitemap = generateSitemap(baseUrl);

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
