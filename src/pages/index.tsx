import { Hero, ScheduleSection, TicketsSectionWithStripe, TimelineSection } from '@/components/organisms';
import { Layout } from '@/components/Layout';
import { Separator } from '@/components/atoms/Separator';
import { heroData, scheduleData, timelineData } from '@/data';
import { dehydrate, HydrationBoundary, type DehydratedState } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { ticketPricingQueryOptions } from '@/lib/queries/tickets';
import type { GetServerSideProps } from 'next';

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
        <ScheduleSection
          title={scheduleData.title}
          subtitle={scheduleData.subtitle}
          aboutLink={scheduleData.aboutLink}
          days={scheduleData.days}
        />
        <Separator variant="diagonal-transition" backgroundColor="white" fill="black" />
        
        <TicketsSectionWithStripe />
        <Separator variant="diagonal-bottom" fill="#000000" className="h-12 md:h-16 lg:h-20" />
        
        <TimelineSection
          kicker={timelineData.kicker}
          title={timelineData.title}
          copy={timelineData.copy}
          entries={timelineData.entries}
        />
        <Separator variant="diagonal-bottom" fill="#19191B" />
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
