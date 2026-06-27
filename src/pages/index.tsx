import {
    Hero,
    ScheduleSection,
    ShapedSection,
    TicketsSectionWithStripe,
    FAQSection,
    SponsorsSection,
    SpeakersSection,
    LearnSection,
    NavBar,
    SiteFooter,
    BlueskyFeedSection
} from '@/components/organisms';
import { SEO, eventSchema, organizationSchema, websiteSchema, speakableSchema, generateFAQSchema } from '@/components/SEO';
import { heroData, scheduleData, sponsorsData, learningData } from '@/data';
import type { DehydratedState } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { createPrefetch } from '@/lib/prefetch';
import { publicSponsorsQueryOptions } from '@/lib/queries/sponsors';
import { publicSpeakersQueryOptions } from '@/lib/queries/speakers';
import { ticketPricingQueryOptions } from '@/lib/queries/tickets';
import { serverAnalytics } from '@/lib/analytics/server';
import { BLUESKY_FEED_TIMEOUT_MS, getCachedBlueskyFeed } from '@/lib/bluesky';
import type { BlueskyFeedResult } from '@/lib/bluesky';
import type { GetStaticProps } from 'next';
import React from "react";

/**
 * Page props passed through _app.tsx for hydration
 * - dehydratedState: Used by HydrationBoundary in _app.tsx
 * Currency detection is handled client-side by CurrencyContext
 */
interface HomePageProps {
  dehydratedState: DehydratedState;
  blueskyFeed: BlueskyFeedResult;
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
    answer: "Switzerland has the perception of being pricey, but there are many ways to make a trip here affordable — some accommodation options come out at under €100 per night. Use our Trip Cost Calculator at /trip-cost to estimate your total trip cost (ticket + travel + hotel). Hotel partnerships are also coming soon — email hello@zurichjs.com to join the waitlist, and feel free to reach out if we can help you navigate how to plan the trip (accommodation, transport, or affordable places to eat).",
  },
  {
    question: "When is the best time to arrive and leave?",
    answer: "Community Day (Sept 9th) isn't essential, but if you're attending a workshop on the 10th, come early and enjoy it. Depart on Sept 12th — nothing's scheduled that day, so you're free to head home whenever suits you. VIP holders get exclusive access to the after party on the evening of Sept 11th, so don't book too early a departure that day.",
  },
];

export default function Home({ blueskyFeed }: HomePageProps) {
  const handleCtaClick = () => {
    // Scroll smoothly to the tickets section
    const ticketsSection = document.getElementById('tickets');
    if (ticketsSection) {
      ticketsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Reflect the anchor in the URL so the section is shareable/bookmarkable.
      window.history.replaceState(null, '', '#tickets');
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
        title="JavaScript Conference Sept 11 2026 Switzerland"
        description="ZurichJS Conf 2026 - One of the top JavaScript conferences in Europe. Join 300+ developers September 11th, 2026 at Technopark Zürich for expert talks on JS, TypeScript, React, Node.js. Workshops & networking. From CHF 175."
        canonical="/"
        ogType="website"
        keywords="javascript conferences 2026, javascript conference 2026, js conference europe 2026, web development conference 2026, typescript conference, react conference, node.js conference, tech conference switzerland, zurich developer conference"
        jsonLd={jsonLdSchemas}
      />
      <main className="min-h-screen">
        <NavBar onGetTicketsClick={handleCtaClick} />

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
            background={heroData.background}
          />
        </div>

        {/* Speakers positioned at the diagonal intersection */}
        <div className="relative z-30 -mt-12 sm:-mt-16 md:-mt-24 lg:-mt-32">
          <SpeakersSection />
        </div>

        <ShapedSection shape="tighten" variant="light" className="relative z-20" compactTop>
          <LearnSection
            title={learningData.title}
            subtitle={learningData.subtitle}
            items={learningData.items}
          />
        </ShapedSection>

        <ShapedSection shape="widen" variant="dark" id="sponsors-photos" disableContainer>
          <SponsorsSection {...sponsorsData} />
        </ShapedSection>

        <ShapedSection shape="tighten" variant="light" id="schedule" className="relative z-20">
          <ScheduleSection
              title={scheduleData.title}
              subtitle={scheduleData.subtitle}
              aboutLink={scheduleData.aboutLink}
              days={scheduleData.days}
          />
        </ShapedSection>

        <ShapedSection shape="widen" variant="dark" id="community-buzz">
          <BlueskyFeedSection initialFeed={blueskyFeed} />
        </ShapedSection>

        <ShapedSection shape="tighten" variant="yellow" id="tickets">
          <TicketsSectionWithStripe />
        </ShapedSection>

        <ShapedSection shape="widen" variant="medium" id="faq">
          <FAQSection />
        </ShapedSection>

          <ShapedSection
              shape="straight"
              variant="dark"
              compactTop={true}
              dropBottom={true}
          >
              <SiteFooter showContactLinks />
          </ShapedSection>
      </main>
    </>
  );
}

/**
 * Server-side data fetching with prefetch utility
 *
 * All queries use optionalQuery — if any fail or exceed the 1 s timeout,
 * the page still renders and the client recovers via useQuery with the
 * same query keys (TanStack Query sees no cached data and refetches).
 *
 * Failures are reported to PostHog via serverAnalytics.
 */
export const getStaticProps: GetStaticProps<HomePageProps> = async () => {
  const queryClient = getQueryClient();
  const { optionalQuery, dehydrate } = createPrefetch(queryClient);

  const results = await Promise.allSettled([
    optionalQuery(publicSponsorsQueryOptions),
    optionalQuery(publicSpeakersQueryOptions()),
    optionalQuery(ticketPricingQueryOptions),
    getCachedBlueskyFeed({ timeoutMs: BLUESKY_FEED_TIMEOUT_MS }),
  ]);

  // Report any rejected promises to PostHog (shouldn't happen since
  // optionalQuery catches internally, but guard against unexpected throws)
  for (const result of results) {
    if (result.status === 'rejected') {
      serverAnalytics.captureException(result.reason, {
        type: 'network',
        severity: 'medium',
        flow: 'ssr_prefetch',
        action: 'homepage_data',
      });
    }
  }

  const blueskyResult = results[3];
  const blueskyFeed =
    blueskyResult?.status === 'fulfilled' && blueskyResult.value
      ? blueskyResult.value
      : { posts: [] };

  return {
    props: {
      dehydratedState: dehydrate(),
      blueskyFeed,
    },
    revalidate: 21600,
  };
};
