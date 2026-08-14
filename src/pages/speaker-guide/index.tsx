import React from "react";
import Link from "next/link";
import { ArrowRight, Bot } from "lucide-react";
import { Kicker, Heading } from "@/components/atoms";
import {
  RichTextRenderer,
  extractNavigationItems,
} from "@/components/RichTextRenderer";
import { PageNavigation } from "@/components/PageNavigation";
import { SEO } from "@/components/SEO";
import { analytics } from "@/lib/analytics/client";
import { speakerGuide } from "@/data/speaker-guide";
import { ShapedSection, SiteFooter } from "@/components/organisms";

/**
 * Unlisted speaker guide shared with confirmed speakers as a direct link.
 * Not linked from navigation, excluded from the sitemap, disallowed in
 * robots.txt, and served with noindex.
 */
const SpeakerGuidePage: React.FC = () => {
  const navigationItems = extractNavigationItems(speakerGuide.sections);

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
                  <p className="text-sm text-gray-500 print:hidden">
                    Last updated: {speakerGuide.lastUpdated}
                  </p>
                </div>
                <Link
                  href="/speaker-guide/chat"
                  onClick={() =>
                    analytics.track("speaker_guide_chat_banner_clicked", {})
                  }
                  className="group flex items-center gap-4 rounded-2xl border-2 border-brand-yellow-main/60 bg-brand-yellow-main/10 p-5 mb-12 transition-colors hover:bg-brand-yellow-main/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow-main print:hidden"
                >
                  <span
                    className="w-11 h-11 rounded-full bg-brand-yellow-main flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                  >
                    <Bot className="w-6 h-6 text-gray-900" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-gray-900">
                      Don&apos;t want to read all this? Chat with Faru
                    </span>
                  </span>
                  <ArrowRight
                    className="w-5 h-5 text-gray-500 flex-shrink-0 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
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
                          onClick={() =>
                            analytics.track("speaker_guide_toc_clicked", {
                              section_id: item.id,
                              section_label: item.label,
                              toc_variant: "inline",
                            })
                          }
                          className="text-sm text-gray-700 underline hover:text-gray-900"
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
                <RichTextRenderer
                  sections={speakerGuide.sections}
                  onQuickLinkClick={(link) => {
                    if (!link.href) return;

                    analytics.track("speaker_guide_quicklink_clicked", {
                      link_label: link.label,
                      link_sublabel: link.sublabel,
                      travel_time: link.travelTime,
                      link_url: link.href,
                    });
                  }}
                />
              </div>
              <aside className="lg:block hidden print:hidden">
                <PageNavigation
                  items={navigationItems}
                  onItemClick={(item) =>
                    analytics.track("speaker_guide_toc_clicked", {
                      section_id: item.id,
                      section_label: item.label,
                      toc_variant: "sidebar",
                    })
                  }
                />
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
