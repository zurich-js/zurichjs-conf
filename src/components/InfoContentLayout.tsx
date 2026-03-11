import React from "react";
import { Kicker, Heading } from "@/components/atoms";
import {
  RichTextRenderer,
  extractNavigationItems,
} from "@/components/RichTextRenderer";
import { PageNavigation } from "@/components/PageNavigation";
import { SEO, organizationSchema, generateBreadcrumbSchema } from "@/components/SEO";
import type { InfoPage } from "@/data/info-pages";
import {DynamicSiteFooter, ShapedSection} from "@/components/organisms";

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
    <ShapedSection
        shape="straight"
        variant="dark"
        compactTop={true}
    >
        <DynamicSiteFooter showContactLinks />
    </ShapedSection>
    </>
  );
};
