import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { Heading, Kicker } from '@/components/atoms';
import { DayTabs, type DayTab } from '@/components/molecules';
import { PageNavigation } from '@/components/PageNavigation';
import {
  RichTextRenderer,
  extractNavigationItems,
} from '@/components/RichTextRenderer';
import { SEO } from '@/components/SEO';
import { ShapedSection, SiteFooter } from '@/components/organisms';
import {
  attendeeInfoByAudience,
  type AttendeeAudience,
} from '@/data/attendee-info';
import { analytics } from '@/lib/analytics/client';

const AUDIENCES = ['local', 'international'] as const;

const AUDIENCE_TABS: DayTab[] = [
  { id: 'local', label: 'Local', date: 'Based in Switzerland' },
  { id: 'international', label: 'International', date: 'Visiting from abroad' },
];

export function AttendeeInfoView() {
  const [audience, setAudience] = useQueryState(
    'audience',
    parseAsStringLiteral(AUDIENCES).withOptions({ shallow: true, clearOnDefault: true }).withDefault('local')
  );

  const guide = attendeeInfoByAudience[audience];
  const navigationItems = extractNavigationItems(guide.sections);

  const handleAudienceChange = (id: string) => {
    const next = id as AttendeeAudience;
    setAudience(next);
    analytics.track('attendee_info_audience_changed', { audience: next });
  };

  return (
    <>
      <SEO title={guide.title} description={guide.description} canonical="/attendee-info" />
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-screen-lg px-4">
          <div className="pt-28 pb-16 md:pt-36 md:pb-24">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px]">
              <div>
                <div className="mb-6">
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
                <div className="mb-12 print:hidden">
                  <DayTabs
                    tabs={AUDIENCE_TABS}
                    activeTab={audience}
                    onTabChange={handleAudienceChange}
                    color="yellow"
                  />
                </div>
                <nav aria-label="Table of contents" className="mb-12 rounded-2xl border border-gray-200 p-5 lg:hidden print:hidden">
                  <p className="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">On this page</p>
                  <ul className="space-y-2">
                    {navigationItems.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          onClick={() => analytics.track('attendee_info_toc_clicked', {
                            section_id: item.id,
                            section_label: item.label,
                            toc_variant: 'inline',
                            audience,
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
                    analytics.track('attendee_info_quicklink_clicked', {
                      link_label: link.label,
                      link_sublabel: link.sublabel,
                      travel_time: link.travelTime,
                      link_url: link.href,
                      audience,
                    });
                  }}
                />
              </div>
              <aside className="hidden lg:block print:hidden">
                <PageNavigation
                  items={navigationItems}
                  onItemClick={(item) => analytics.track('attendee_info_toc_clicked', {
                    section_id: item.id,
                    section_label: item.label,
                    toc_variant: 'sidebar',
                    audience,
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
