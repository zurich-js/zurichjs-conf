import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import { serialize } from 'next-mdx-remote/serialize';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { ArrowLeft } from 'lucide-react';
import {
  SEO,
  organizationSchema,
  generateBreadcrumbSchema,
} from '@/components/SEO';
import { BlogPostHeader, mdxComponents, BlueskyComments } from '@/components/blog';
import { getAllSlugs, getPostBySlug } from '@/lib/blog';
import { getAuthor } from '@/lib/blog/authors';
import type { BlogFrontmatter } from '@/lib/blog';
import {DynamicSiteFooter, ShapedSection} from "@/components/organisms";
import React from "react";

interface BlogPostPageProps {
  frontmatter: BlogFrontmatter;
  slug: string;
  mdxSource: MDXRemoteSerializeResult;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getAllSlugs();
  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<BlogPostPageProps> = async ({
  params,
}) => {
  const slug = params?.slug as string;
  const post = getPostBySlug(slug);
  const mdxSource = await serialize(post.content);

  return {
    props: {
      frontmatter: post.frontmatter,
      slug: post.slug,
      mdxSource,
    },
  };
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://conf.zurichjs.com';

export default function BlogPostPage({
  frontmatter,
  slug,
  mdxSource,
}: BlogPostPageProps) {
  const author = getAuthor(frontmatter.author);

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: frontmatter.title, url: `/blog/${slug}` },
  ]);

  const blogPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: frontmatter.title,
    description: frontmatter.excerpt,
    datePublished: frontmatter.date,
    author: {
      '@type': 'Person',
      name: author.name,
      ...(author.bluesky && { url: author.bluesky }),
    },
    publisher: {
      '@id': `${BASE_URL}/#organization`,
    },
    url: `${BASE_URL}/blog/${slug}`,
    keywords: frontmatter.tags?.join(', '),
  };

  return (
    <>
      <SEO
        title={frontmatter.title}
        description={frontmatter.excerpt}
        canonical={`/blog/${slug}`}
        ogType="article"
        publishedTime={frontmatter.date}
        author={author.name}
        feedUrl={`${BASE_URL}/blog/feed.xml`}
        keywords={frontmatter.tags?.join(', ')}
        jsonLd={[organizationSchema, breadcrumbSchema, blogPostingSchema]}
      />
      <main className="min-h-screen bg-white">
        <div className="max-w-screen-lg mx-auto px-4">
          <div className="pt-28 pb-16 md:pt-36 md:pb-24">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-orange transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to all posts
            </Link>

            <BlogPostHeader frontmatter={frontmatter} />

            <article className="text-base">
              <MDXRemote {...mdxSource} components={mdxComponents} />
            </article>

            <BlueskyComments postUri={frontmatter.blueskyPostUri} />
          </div>
        </div>
      </main>
        <ShapedSection
            shape="straight"
            variant="dark"
            compactTop={true}
        >
            <DynamicSiteFooter />
        </ShapedSection>
    </>
  );
}
