import {
  BlueskyFeedSection,
  FAQSection,
  Hero,
  LearnSection,
  NavBar,
  ScheduleSection,
  ShapedSection,
  SiteFooter,
  SpeakersSection,
  SponsorsSection,
  TicketsSectionWithStripe,
} from '@/components/organisms';
import {
  SEO,
  eventSchema,
  generateFAQSchema,
  organizationSchema,
  speakableSchema,
  websiteSchema,
} from '@/components/SEO';
import { heroData, learningData, scheduleData, sponsorsData } from '@/data';
import { serverAnalytics } from '@/lib/analytics/server';
import { BLUESKY_FEED_TIMEOUT_MS, getCachedBlueskyFeed } from '@/lib/bluesky';
import type { BlueskyFeedResult } from '@/lib/bluesky';
import { createPrefetch } from '@/lib/prefetch';
import { getQueryClient } from '@/lib/query-client';
import { publicSpeakersQueryOptions } from '@/lib/queries/speakers';
import { publicSponsorsQueryOptions } from '@/lib/queries/sponsors';
import { ticketPricingQueryOptions } from '@/lib/queries/tickets';
import type { DehydratedState } from '@tanstack/react-query';
import type { GetServerSideProps } from 'next';

/**
 * Page props passed through _app.tsx for hydration.
 * Currency detection is handled client-side by CurrencyContext.
 */
interface HomePageProps {
  dehydratedState: DehydratedState;
  blueskyFeed: BlueskyFeedResult;
}

const faqSchemaData = [
  {
    question: "What if I can't attend ZurichJS Conference?",
    answer:
      'All ticket sales are final. Refunds are not available except on a case-by-case basis in exceptional circumstances. Contact hello@zurichjs.com for requests.',
  },
  {
    question: 'Do you offer team or bulk discounts?',
    answer:
      'Yes! We offer team packages with custom pricing including simplified invoicing and bank transfer payment options. Contact us for team pricing.',
  },
  {
    question: 'Can I transfer my ticket to someone else?',
    answer:
      'Ticket transfers are evaluated on a case-by-case basis. Email hello@zurichjs.com with your order number and reason for transfer.',
  },
  {
    question: "Switzerland is expensive - I'm on a budget, what are my options?",
    answer:
      'Switzerland has the perception of being pricey, but there are many ways to make a trip here affordable. Use our Trip Cost Calculator at /trip-cost to estimate your total trip cost. Hotel partnerships are also coming soon.',
  },
  {
    question: 'When is the best time to arrive and leave?',
    answer:
      "Community Day (Sept 9th) isn't essential, but if you're attending a workshop on the 10th, come early and enjoy it. Depart evening of Sept 12th or 13th. VIP holders should keep the full day of Sept 12th free for speaker activities.",
  },
];

export default function Home({ blueskyFeed }: HomePageProps) {
  const handleCtaClick = () => {
    const ticketsSection = document.getElementById('tickets');
    if (ticketsSection) {
      ticketsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
        description="ZurichJS Conf 2026 - One of the top JavaScript conferences in Europe. Join 300+ developers September 11th, 2026 at Technopark Zurich for expert talks on JS, TypeScript, React, Node.js. Workshops & networking. From CHF 175."
        canonical="/"
        ogType="website"
        keywords="javascript conferences 2026, javascript conference 2026, js conference europe 2026, web development conference 2026, typescript conference, react conference, node.js conference, tech conference switzerland, zurich developer conference"
        jsonLd={jsonLdSchemas}
      />
      <main className="min-h-screen">
        <NavBar onGetTicketsClick={handleCtaClick} />

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

        <ShapedSection shape="straight" variant="dark" compactTop>
          <SiteFooter />
        </ShapedSection>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<HomePageProps> = async () => {
  const queryClient = getQueryClient();
  const { optionalQuery, dehydrate } = createPrefetch(queryClient);

  const results = await Promise.allSettled([
    optionalQuery(publicSponsorsQueryOptions),
    optionalQuery(publicSpeakersQueryOptions()),
    optionalQuery(ticketPricingQueryOptions),
    getCachedBlueskyFeed({ timeoutMs: BLUESKY_FEED_TIMEOUT_MS }),
  ]);

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
  };
};
