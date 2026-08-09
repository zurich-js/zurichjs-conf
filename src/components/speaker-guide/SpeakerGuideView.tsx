import Link from 'next/link';
import { ArrowRight, Bot } from 'lucide-react';
import { Heading, Kicker } from '@/components/atoms';
import { PageNavigation } from '@/components/PageNavigation';
import {
  RichTextRenderer,
  extractNavigationItems,
} from '@/components/RichTextRenderer';
import { SEO } from '@/components/SEO';
import { ShapedSection, SiteFooter } from '@/components/organisms';
import type { InfoPage } from '@/data/info-pages';
import { analytics } from '@/lib/analytics/client';

export interface SpeakerGuideViewProps {
  guide: InfoPage;
  chatHref: string;
}

export function SpeakerGuideView({ guide, chatHref }: SpeakerGuideViewProps) {
  const navigationItems = extractNavigationItems(guide.sections);

  return (
    <>
      <SEO title={guide.title} description={guide.description} noindex />
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-screen-lg px-4">
          <div className="pt-28 pb-16 md:pt-36 md:pb-24">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px]">
              <div>
                <div className="mb-12">
                  {guide.kicker && (
                    <Kicker variant="light" className="mb-4 print:hidden">
                      {guide.kicker}
                    </Kicker>
                  )}
                  <Heading level="h1" variant="light" className="mb-6 text-2xl font-bold">
                    {guide.title}
                  </Heading>
                  <p className="text-sm text-gray-500 print:hidden">
                    Last updated: {guide.lastUpdated}
                  </p>
                </div>
                <Link
                  href={chatHref}
                  onClick={() => analytics.track('speaker_guide_chat_banner_clicked', {})}
                  className="group mb-12 flex items-center gap-4 rounded-2xl border-2 border-brand-yellow-main/60 bg-brand-yellow-main/10 p-5 transition-colors hover:bg-brand-yellow-main/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow-main print:hidden"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-yellow-main" aria-hidden="true">
                    <Bot className="size-6 text-gray-900" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-gray-900">
                      Don&apos;t want to read all this? Chat with Faru
                    </span>
                  </span>
                  <ArrowRight className="size-5 shrink-0 text-gray-500 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
                <nav aria-label="Table of contents" className="mb-12 rounded-2xl border border-gray-200 p-5 lg:hidden print:hidden">
                  <p className="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">On this page</p>
                  <ul className="space-y-2">
                    {navigationItems.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          onClick={() => analytics.track('speaker_guide_toc_clicked', {
                            section_id: item.id,
                            section_label: item.label,
                            toc_variant: 'inline',
                          })}
                          className="text-sm text-gray-700 underline hover:text-gray-900"
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
                <RichTextRenderer
                  sections={guide.sections}
                  onQuickLinkClick={(link) => {
                    if (!link.href) return;
                    analytics.track('speaker_guide_quicklink_clicked', {
                      link_label: link.label,
                      link_sublabel: link.sublabel,
                      travel_time: link.travelTime,
                      link_url: link.href,
                    });
                  }}
                />
              </div>
              <aside className="hidden lg:block print:hidden">
                <PageNavigation
                  items={navigationItems}
                  onItemClick={(item) => analytics.track('speaker_guide_toc_clicked', {
                    section_id: item.id,
                    section_label: item.label,
                    toc_variant: 'sidebar',
                  })}
                />
              </aside>
            </div>
          </div>
        </div>
      </main>
      <ShapedSection shape="straight" variant="dark" compactTop>
        <SiteFooter showContactLinks />
      </ShapedSection>
    </>
  );
}
