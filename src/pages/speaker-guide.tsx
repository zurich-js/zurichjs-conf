import React from "react";
import { Kicker, Heading } from "@/components/atoms";
import {
  RichTextRenderer,
  extractNavigationItems,
} from "@/components/RichTextRenderer";
import { PageNavigation } from "@/components/PageNavigation";
import { SEO } from "@/components/SEO";
import { GuideChat } from "@/components/speaker-guide";
import { speakerGuide } from "@/data/speaker-guide";
import { ShapedSection, SiteFooter } from "@/components/organisms";

/**
 * Unlisted speaker guide — shared with confirmed speakers as a direct link.
 * Not linked from navigation, excluded from the sitemap, disallowed in
 * robots.txt, and served with noindex.
 */
const SpeakerGuidePage: React.FC = () => {
  const navigationItems = [
    ...extractNavigationItems(speakerGuide.sections),
    { id: "ask-the-guide", label: "Ask the Guide" },
  ];

  return (
    <>
      <SEO
        title={speakerGuide.title}
        description={speakerGuide.description}
        noindex
      />
      <main className="min-h-screen bg-white">
        <div className="max-w-screen-lg mx-auto px-4">
          <div className="pt-28 pb-16 md:pt-36 md:pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">
              <div>
                <div className="mb-12">
                  <Kicker variant="light" className="mb-4 print:hidden">
                    {speakerGuide.kicker}
                  </Kicker>
                  <Heading
                    level="h1"
                    variant="light"
                    className="mb-6 text-2xl font-bold"
                  >
                    {speakerGuide.title}
                  </Heading>
                  <p className="text-lg text-gray-700 leading-relaxed print:hidden">
                    {speakerGuide.description}
                  </p>
                  <p className="text-sm text-gray-500 mt-4 print:hidden">
                    Last updated: {speakerGuide.lastUpdated}
                  </p>
                </div>
                <nav
                  aria-label="Table of contents"
                  className="lg:hidden mb-12 rounded-2xl border border-gray-200 p-5 print:hidden"
                >
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    On this page
                  </p>
                  <ul className="space-y-2">
                    {navigationItems.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          className="text-sm text-gray-700 underline hover:text-gray-900"
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
                <RichTextRenderer sections={speakerGuide.sections} />
                <GuideChat sections={speakerGuide.sections} />
              </div>
              <aside className="lg:block hidden print:hidden">
                <PageNavigation items={navigationItems} />
              </aside>
            </div>
          </div>
        </div>
      </main>
      <ShapedSection shape="straight" variant="dark" compactTop={true}>
        <SiteFooter showContactLinks />
      </ShapedSection>
    </>
  );
};

export default SpeakerGuidePage;
