import React from "react";
import { motion } from "framer-motion";
import { Logo } from "@/components/atoms/Logo";
import { SocialIcon } from "@/components/atoms/SocialIcon";
import { Button } from "@/components/atoms/Button";
import { Kicker, Heading } from "@/components/atoms";
import { SectionContainer } from "@/components/organisms/SectionContainer";
import {
  RichTextRenderer,
  extractNavigationItems,
} from "@/components/RichTextRenderer";
import { PageNavigation } from "@/components/PageNavigation";
import { SEO, organizationSchema, generateBreadcrumbSchema } from "@/components/SEO";
import type { InfoPage } from "@/data/info-pages";

export interface InfoContentLayoutProps {
  page: InfoPage;
  actions?: React.ReactNode;
}
export const InfoContentLayout: React.FC<InfoContentLayoutProps> = ({
  page,
  actions,
}) => {
  // Extract navigation items from page content
  const navigationItems = extractNavigationItems(page.sections);

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

  // Breadcrumb schema for info pages
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: page.title, url: `/info/${page.slug}` },
  ]);

  return (
    <>
      <SEO
        title={page.title}
        description={page.description}
        canonical={`/info/${page.slug}`}
        jsonLd={[organizationSchema, breadcrumbSchema]}
      />
      <main className="min-h-screen bg-white">
        <div className="max-w-screen-lg mx-auto px-4">
          <div className="pt-28 pb-16 md:pt-36 md:pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">
              <div>
                <div className="mb-12">
                  <Kicker variant="light" className="mb-4 print:hidden">
                    {page.kicker}
                  </Kicker>
                  <Heading
                    level="h1"
                    variant="light"
                    className="mb-6 text-2xl font-bold"
                  >
                    {page.title}
                  </Heading>
                  <p className="text-lg text-gray-700 leading-relaxed print:hidden">
                    {page.description}
                  </p>
                  <p className="text-sm text-gray-500 mt-4 print:hidden">
                    Last updated: {page.lastUpdated}
                  </p>
                </div>
                <RichTextRenderer sections={page.sections} />
                {actions && <div className="mt-12 print:hidden">{actions}</div>}
              </div>
              <aside className="lg:block hidden print:hidden">
                <PageNavigation items={navigationItems} />
              </aside>
            </div>
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
};
