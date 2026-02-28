import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import { serialize } from 'next-mdx-remote/serialize';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/atoms/Logo';
import { SocialIcon } from '@/components/atoms/SocialIcon';
import { Button } from '@/components/atoms/Button';
import { SectionContainer } from '@/components/organisms/SectionContainer';
import {
  SEO,
  organizationSchema,
  generateBreadcrumbSchema,
} from '@/components/SEO';
import { BlogPostHeader, mdxComponents, BlueskyComments } from '@/components/blog';
import { getAllSlugs, getPostBySlug } from '@/lib/blog';
import type { BlogFrontmatter } from '@/lib/blog';

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

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export default function BlogPostPage({
  frontmatter,
  slug,
  mdxSource,
}: BlogPostPageProps) {
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
      name: frontmatter.author,
    },
    publisher: {
      '@id': `${BASE_URL}/#organization`,
    },
    url: `${BASE_URL}/blog/${slug}`,
    keywords: frontmatter.tags.join(', '),
  };

  return (
    <>
      <SEO
        title={frontmatter.title}
        description={frontmatter.excerpt}
        canonical={`/blog/${slug}`}
        ogType="article"
        publishedTime={frontmatter.date}
        keywords={frontmatter.tags.join(', ')}
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

            <article>
              <MDXRemote {...mdxSource} components={mdxComponents} />
            </article>

            <BlueskyComments postUri={frontmatter.blueskyPostUri} />
          </div>
        </div>
      </main>
      <footer className="bg-black text-white py-16 md:py-24 print:hidden">
        <SectionContainer>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="space-y-12"
          >
            <motion.div variants={item} className="space-y-4">
              <p className="text-brand-gray-light text-xs sm:text-sm font-semibold uppercase tracking-wider">
                Get in touch
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
                Questions or feedback?
              </h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16">
              <motion.div variants={item} className="space-y-4 md:space-y-6">
                <div className="space-y-3 md:space-y-4">
                  <div>
                    <p className="text-xs sm:text-sm text-brand-white-light font-semibold mb-1">
                      General Inquiries
                    </p>
                    <a
                      href="mailto:hello@zurichjs.com"
                      className="text-brand-gray-light hover:underline text-sm sm:text-base break-all"
                    >
                      hello@zurichjs.com
                    </a>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-brand-white-light font-semibold mb-1">
                      Ticket Support
                    </p>
                    <a
                      href="mailto:hello@zurichjs.com"
                      className="text-brand-gray-light hover:underline text-sm sm:text-base break-all"
                    >
                      hello@zurichjs.com
                    </a>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-brand-white-light font-semibold mb-1">
                      Sponsorship
                    </p>
                    <a
                      href="mailto:hello@zurichjs.com"
                      className="hover:underline text-brand-gray-light text-sm sm:text-base break-all"
                    >
                      hello@zurichjs.com
                    </a>
                  </div>
                </div>
              </motion.div>
              <motion.div variants={item} className="space-y-4 md:space-y-6">
                <p className="text-brand-gray-light text-sm sm:text-base leading-relaxed">
                  We would love to hear from you! Whether you have questions
                  about the conference, want to become a sponsor, or are
                  interested in speaking, our team is here to help.
                </p>
                <a
                  href="mailto:hello@zurichjs.com?subject=Contact from ZurichJS Conf 2026"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="black" size="xs" className="w-full md:w-auto">
                    Contact Us
                  </Button>
                </a>
              </motion.div>
            </div>
            <motion.div
              variants={item}
              className="pt-8 md:pt-12 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6"
            >
              <div className="flex flex-col items-center md:items-start gap-2">
                <Logo width={140} height={38} className="sm:w-[160px] sm:h-[43px]" />
                <p className="text-xs sm:text-sm text-brand-gray-light">
                  ZurichJS Conference 2026
                </p>
              </div>
              <div className="flex gap-3">
                <SocialIcon
                  kind="linkedin"
                  href="https://www.linkedin.com/company/zurichjs"
                  label="Follow ZurichJS on LinkedIn"
                />
                <SocialIcon
                  kind="instagram"
                  href="https://www.instagram.com/zurich.js"
                  label="Follow ZurichJS on Instagram"
                />
              </div>
            </motion.div>
          </motion.div>
        </SectionContainer>
      </footer>
    </>
  );
}
