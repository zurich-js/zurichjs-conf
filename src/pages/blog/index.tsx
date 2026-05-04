import { GetStaticProps } from "next";
import { useRouter } from "next/router";
import { Kicker, Heading } from "@/components/atoms";
import {
  SEO,
  organizationSchema,
  generateBreadcrumbSchema,
} from "@/components/SEO";
import { BlogPostCard, BlogTagFilter } from "@/components/blog";
import { getAllPosts, getAllTags } from "@/lib/blog";
import type { BlogPostMeta } from "@/lib/blog";
import {SiteFooter, ShapedSection} from "@/components/organisms";
import React from "react";

interface BlogPageProps {
  posts: BlogPostMeta[];
  tags: string[];
}

export const getStaticProps: GetStaticProps<BlogPageProps> = async () => {
  const posts = getAllPosts();
  const tags = getAllTags();

  return {
    props: { posts, tags },
  };
};

export default function BlogPage({ posts, tags }: BlogPageProps) {
  const router = useRouter();
  const activeTag =
    typeof router.query.tag === "string" ? router.query.tag : undefined;

  const filteredPosts = activeTag
    ? posts.filter((post) => post.frontmatter.tags?.includes(activeTag))
    : posts;

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
  ]);

  return (
    <>
      <SEO
        title="Blog"
        description="News, announcements, and articles from the ZurichJS Conference team. Stay up to date with speaker announcements, community stories, and conference updates."
        canonical="/blog"
        keywords="zurichjs blog, javascript blog, conference news, speaker announcements"
        feedUrl={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://conf.zurichjs.com'}/blog/feed.xml`}
        jsonLd={[organizationSchema, breadcrumbSchema]}
      />
      <main className="min-h-screen bg-white">
        <div className="max-w-screen-lg mx-auto px-4">
          <div className="pt-28 pb-16 md:pt-36 md:pb-24">
            <div className="mb-12">
              <Kicker variant="light" className="mb-4">
                Blog
              </Kicker>
              <Heading
                level="h1"
                variant="light"
                className="mb-6 text-2xl font-bold"
              >
                ZurichJS Blog
              </Heading>
              <p className="text-base text-brand-gray-medium leading-relaxed">
                This Blog is an is an experiment and a space for thinking out
                loud together. Not every post is a breakthrough or a new
                invention. Instead, this blog captures the ideas, experiments,
                and reflections that help developers learn from each other. We
                highlight perspectives from speakers, contributors, and
                attendees, aiming to surface knowledge that strengthens the
                community and connects engineers across teams, companies, and
                borders. Whether you’re attending the conference or following
                from afar, this is where we continue the technical and human
                side of building the web together.
              </p>
            </div>

            <div className="mb-8">
              <BlogTagFilter tags={tags} activeTag={activeTag} />
            </div>

            {filteredPosts.length > 0 ? (
              <div>
                {filteredPosts.map((post) => (
                  <BlogPostCard key={post.slug} post={post} />
                ))}
              </div>
            ) : (
              <div className="py-16">
                <p className="text-gray-500">
                  No posts found{activeTag ? ` tagged "${activeTag}"` : ""}.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
        <ShapedSection
            shape="straight"
            variant="dark"
            compactTop={true}
        >
            <SiteFooter />
        </ShapedSection>
    </>
  );
}
