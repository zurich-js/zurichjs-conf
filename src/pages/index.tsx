import { Hero, ScheduleSection, ShapedSection, DynamicSiteFooter, TicketsSectionWithStripe, TimelineSection, FAQSection, SponsorsSection, SpeakersSection } from '@/components/organisms';
import { SEO, eventSchema, organizationSchema, websiteSchema, speakableSchema, generateFAQSchema } from '@/components/SEO';
import { heroData, scheduleData, timelineData, sponsorsData } from '@/data';
import { dehydrate, type DehydratedState } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { createTicketPricingQueryOptions } from '@/lib/queries/tickets';
import { detectCountryFromRequest } from '@/lib/geo/detect-country';
import { getCurrencyFromCountry } from '@/config/currency';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';

/**
 * Page props passed through _app.tsx for hydration and currency detection
 * - dehydratedState: Used by HydrationBoundary in _app.tsx
 * - detectedCurrency: Used by CurrencyProvider in _app.tsx
 */
interface HomePageProps {
  dehydratedState: DehydratedState;
  detectedCurrency: 'CHF' | 'EUR';
}

// FAQ data for schema (plain text versions)
const faqSchemaData = [
  {
    question: "What if I can't attend ZurichJS Conference?",
    answer: "All ticket sales are final. Refunds are not available except on a case-by-case basis in exceptional circumstances. Contact hello@zurichjs.com for requests.",
  },
  {
    question: "Do you offer team or bulk discounts?",
    answer: "Yes! We offer team packages with custom pricing including simplified invoicing and bank transfer payment options. Contact us for team pricing.",
  },
  {
    question: "Can I transfer my ticket to someone else?",
    answer: "Ticket transfers are evaluated on a case-by-case basis. Email hello@zurichjs.com with your order number and reason for transfer.",
  },
  {
    question: "Switzerland is expensive – I'm on a budget, what are my options?",
    answer: "Hotel partnerships are coming soon! Email hello@zurichjs.com to join the waitlist and be the first to hear about it. We're happy to help you work within your budget.",
  },
  {
    question: "When is the best time to arrive and leave?",
    answer: "Community Day (Sept 9th) isn't essential, but if you're attending a workshop on the 10th, come early and enjoy it. Depart evening of Sept 12th or 13th. VIP holders should keep the full day of Sept 12th free for speaker activities.",
  },
];

export default function Home() {
  const handleCtaClick = () => {
    // Scroll smoothly to the tickets section
    const ticketsSection = document.getElementById('tickets');
    if (ticketsSection) {
      ticketsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Combine all schemas for the homepage - optimized for search and AI discoverability
  const jsonLdSchemas = [
    eventSchema,
    organizationSchema,
    websiteSchema,
    speakableSchema,
    generateFAQSchema(faqSchemaData),
  ];

  return (
    <>
      <SEO
        title="JavaScript Conference 2026 | ZurichJS Conf Sept 11 Switzerland"
        description="ZurichJS Conf 2026 - One of the top JavaScript conferences in Europe. Join 300+ developers September 11th, 2026 at Technopark Zürich for expert talks on JS, TypeScript, React, Node.js. Workshops & networking. From CHF 175."
        canonical="/"
        ogType="website"
        keywords="javascript conferences 2026, javascript conference 2026, js conference europe 2026, web development conference 2026, typescript conference, react conference, node.js conference, tech conference switzerland, zurich developer conference"
        jsonLd={jsonLdSchemas}
      />
      <main className="min-h-screen">
        {/* Hero with speakers overlapping the diagonal */}
        <div className="relative">
          <Hero
            title={heroData.title}
            kicker={heroData.kicker}
            dateTimeISO={heroData.dateTimeISO}
            venue={heroData.venue}
            city={heroData.city}
            ctaLabel={heroData.ctaLabel}
            onCtaClick={handleCtaClick}
            speakers={heroData.speakers}
            background={heroData.background}
          />
        </div>

        {/* Speakers positioned at the diagonal intersection */}
        <div className="relative z-30 -mt-12 sm:-mt-16 md:-mt-24 lg:-mt-32 overflow-visible">
          <SpeakersSection />
        </div>

        <ShapedSection shape="widen" variant="light" id="schedule" className="relative z-20">
          {/* CTA to apply to speak - pulled up to sit closer to speaker cards */}
          <p className="text-center text-gray-600 text-base px-4 pb-8 relative -top-4 sm:-top-6 md:-top-8">
            Want to share your knowledge at ZurichJS?{' '}
            <Link href="/cfp" className="text-brand-blue hover:text-blue-800 duration-300 ease-in-out">
              Apply&nbsp;to&nbsp;speak
            </Link>
          </p>
          <ScheduleSection
            title={scheduleData.title}
            subtitle={scheduleData.subtitle}
            aboutLink={scheduleData.aboutLink}
            days={scheduleData.days}
          />
        </ShapedSection>

        <ShapedSection shape="tighten" variant="dark" id="sponsors-photos" disableContainer>
          <SponsorsSection {...sponsorsData} />
        </ShapedSection>

        <ShapedSection shape="widen" variant="medium" id="timeline">
          <TimelineSection
            kicker={timelineData.kicker}
            title={timelineData.title}
            subtitle={timelineData.subtitle}
            entries={timelineData.entries}
          />
        </ShapedSection>

        <ShapedSection shape="tighten" variant="yellow" id="tickets">
          <TicketsSectionWithStripe />
        </ShapedSection>

        <ShapedSection shape="widen" variant="medium" id="faq">
          <FAQSection />
        </ShapedSection>

        <ShapedSection shape="tighten" variant="dark" dropBottom>
          <DynamicSiteFooter />
        </ShapedSection>
      </main>
    </>
  );
}

/**
 * Server-side data fetching with TanStack Query prefetching
 * Detects user currency from geo-location and prefetches appropriate pricing
 */
export const getServerSideProps: GetServerSideProps<HomePageProps> = async (context) => {
  const queryClient = getQueryClient();

  // Detect country from request headers (Vercel, Cloudflare, etc.)
  const countryCode = detectCountryFromRequest(context.req);
  const detectedCurrency = getCurrencyFromCountry(countryCode);

  // Prefetch ticket pricing for the detected currency
  await queryClient.prefetchQuery(createTicketPricingQueryOptions(detectedCurrency));

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
      detectedCurrency,
    },
  };
};
