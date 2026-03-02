import { GetServerSideProps } from 'next';
import { getAllPosts } from '@/lib/blog';
import { getAuthor } from '@/lib/blog/authors';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://conf.zurichjs.com';

const escapeXml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const toRfc822 = (dateStr: string): string =>
  new Date(dateStr).toUTCString();

const generateFeed = (): string => {
  const posts = getAllPosts();
  const lastBuildDate = posts.length > 0 ? toRfc822(posts[0].frontmatter.date) : new Date().toUTCString();

  const items = posts
    .map((post) => {
      const author = getAuthor(post.frontmatter.author);
      const url = `${BASE_URL}/blog/${post.slug}`;

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
    <title>ZurichJS Conf Blog</title>
    <link>${BASE_URL}/blog</link>
    <description>News, announcements, and articles from the ZurichJS Conference team.</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${BASE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
};

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const feed = generateFeed();

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800');
  res.write(feed);
  res.end();

  return { props: {} };
};

export default function Feed(): null {
  return null;
}
