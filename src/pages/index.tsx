import { Hero, ScheduleSection, ShapedSection, SiteFooter, TicketsSectionWithStripe, TimelineSection, FAQSection, SponsorsSection } from '@/components/organisms';
import { SEO, eventSchema, organizationSchema, websiteSchema, generateFAQSchema } from '@/components/SEO';
import { footerData, heroData, scheduleData, timelineData, sponsorsData } from '@/data';
import { dehydrate, HydrationBoundary, type DehydratedState } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { ticketPricingQueryOptions } from '@/lib/queries/tickets';
import type { GetServerSideProps } from 'next';
import React from "react";

interface HomeProps {
  dehydratedState: DehydratedState;
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

export default function Home({ dehydratedState }: HomeProps) {
  const handleCtaClick = () => {
    // Scroll smoothly to the tickets section
    const ticketsSection = document.getElementById('tickets');
    if (ticketsSection) {
      ticketsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Combine all schemas for the homepage
  const jsonLdSchemas = [
    eventSchema,
    organizationSchema,
    websiteSchema,
    generateFAQSchema(faqSchemaData),
  ];

  return (
    <HydrationBoundary state={dehydratedState}>
      <SEO
        title="ZurichJS Conference 2026 | Sept 11 Zurich | JavaScript & Web Dev"
        description="Join 300+ developers at Switzerland's premier JavaScript conference. Sep 11, 2026 at Technopark Zürich. Talks, workshops, networking. Tickets from CHF 489."
        canonical="/"
        ogType="website"
        keywords="javascript conference, zurich tech conference, javascript switzerland, web development conference, js conference 2026, technopark zurich"
        jsonLd={jsonLdSchemas}
      />
      <main className="min-h-screen">
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

        <ShapedSection shape="widen" variant="light" id="schedule">
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
          <SiteFooter {...footerData} />
        </ShapedSection>
      </main>
    </HydrationBoundary>
  );
}

/**
 * Server-side data fetching with TanStack Query prefetching
 * Prefetches ticket pricing on the server for optimal performance
 */
export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  const queryClient = getQueryClient();

  // Prefetch ticket pricing on the server
  await queryClient.prefetchQuery(ticketPricingQueryOptions);

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  };
};
