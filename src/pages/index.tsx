import { Hero, ScheduleSection, ShapedSection, SiteFooter, TicketsSectionWithStripe, TimelineSection, FAQSection, SponsorsSection } from '@/components/organisms';
import { Layout } from '@/components/Layout';
import { footerData, heroData, scheduleData, timelineData, sponsorsData } from '@/data';
import { dehydrate, HydrationBoundary, type DehydratedState } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { ticketPricingQueryOptions } from '@/lib/queries/tickets';
import type { GetServerSideProps } from 'next';
import React from "react";

interface HomeProps {
  dehydratedState: DehydratedState;
}

export default function Home({ dehydratedState }: HomeProps) {
  const handleCtaClick = () => {
    // Scroll smoothly to the tickets section
    const ticketsSection = document.getElementById('tickets');
    if (ticketsSection) {
      ticketsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <HydrationBoundary state={dehydratedState}>
      <Layout
        title="ZurichJS Conference 2026 | JavaScript Conference in Zurich"
        description="Join us for an amazing JavaScript conference in Zurich. Learn from industry experts, network with peers, and explore the latest in web development."
      >
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
            travelNote={scheduleData.travelNote}
            accommodationNote={scheduleData.accommodationNote}
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
      </Layout>
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
