import { GetStaticProps } from "next";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Logo } from "@/components/atoms/Logo";
import { SocialIcon } from "@/components/atoms/SocialIcon";
import { Button } from "@/components/atoms/Button";
import { Kicker, Heading } from "@/components/atoms";
import { SectionContainer } from "@/components/organisms/SectionContainer";
import {
  SEO,
  organizationSchema,
  generateBreadcrumbSchema,
} from "@/components/SEO";
import { BlogPostCard, BlogTagFilter } from "@/components/blog";
import { getAllPosts, getAllTags } from "@/lib/blog";
import type { BlogPostMeta } from "@/lib/blog";

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

export default function BlogPage({ posts, tags }: BlogPageProps) {
  const router = useRouter();
  const activeTag =
    typeof router.query.tag === "string" ? router.query.tag : undefined;

  const filteredPosts = activeTag
    ? posts.filter((post) => post.frontmatter.tags.includes(activeTag))
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
                The Community Build
              </Heading>
              <p className="text-sm text-brand-gray-medium leading-relaxed">
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
                  <Button
                    variant="black"
                    size="xs"
                    className="w-full md:w-auto"
                  >
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
                <Logo
                  width={140}
                  height={38}
                  className="sm:w-[160px] sm:h-[43px]"
                />
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
