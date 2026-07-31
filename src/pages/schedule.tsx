import { type ReactNode } from 'react';
import type { GetServerSideProps } from 'next';
import { useQuery } from '@tanstack/react-query';
import { useQueryState, parseAsStringLiteral } from 'nuqs';
import { SEO } from '@/components/SEO';
import { Button, Heading, Kicker } from '@/components/atoms';
import { DayTabs } from '@/components/molecules';
import { ShapedSection, SiteFooter } from '@/components/organisms';
import { useCurrency } from '@/contexts/CurrencyContext';
import { createWorkshopsScheduleQueryOptions } from '@/lib/queries/workshops';
import { PlaceholderCard, ProgramScheduleItemCard } from '@/components/scheduling';
import { communityDayMeetup, publicProgramTabs, warmupChillRun, warmupChillRunScheduleItem } from '@/data';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';
import { buildPublicProgramScheduleItems, getPublicScheduleRows } from '@/lib/program/schedule';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import type { PublicProgramScheduleItem } from '@/lib/types/program-schedule';

interface SchedulePageProps {
  items: PublicProgramScheduleItem[];
}

const DAY_PARAMS = ['community', 'workshop', 'conf', 'post-conf'] as const;

const scheduleDayParamToTab: Record<(typeof DAY_PARAMS)[number], (typeof publicProgramTabs)[number]['id']> = {
  community: 'community',
  workshop: 'warmup',
  conf: 'conference',
  'post-conf': 'post-conference',
};

const scheduleTabToDayParam: Record<(typeof publicProgramTabs)[number]['id'], (typeof DAY_PARAMS)[number]> = {
  community: 'community',
  warmup: 'workshop',
  conference: 'conf',
  'post-conference': 'post-conf',
};

export default function SchedulePage({ items }: SchedulePageProps) {
  // URL-driven via nuqs so tab flips don't emit router events (and phantom
  // $pageview captures), matching the workshops page pattern.
  const [dayParam, setDayParam] = useQueryState(
    'day',
    parseAsStringLiteral(DAY_PARAMS).withDefault('community').withOptions({ shallow: true, clearOnDefault: true })
  );
  const activeTab = scheduleDayParamToTab[dayParam];
  const activeScheduleTab = publicProgramTabs.find((tab) => tab.id === activeTab) ?? publicProgramTabs[0];
  // Workshop offerings so workshop rows show their price + add-to-cart chip
  // here too, not only on /workshops. Shares the TanStack cache with that page.
  const { currency } = useCurrency();
  const { data: workshopsData } = useQuery(createWorkshopsScheduleQueryOptions(currency));
  const dayItems = activeScheduleTab.sessionDate
    ? items.filter((item) => item.date === activeScheduleTab.sessionDate)
    : items.filter((item) => item.date === (activeTab === 'community' ? '2026-09-09' : '2026-09-12'));
  const visibleItems = activeTab === 'warmup'
    ? [...dayItems, warmupChillRunScheduleItem].sort((a, b) => a.start_time.localeCompare(b.start_time))
    : dayItems;

  const getEventActions = (item: PublicProgramScheduleItem): ReactNode => {
    if (item.type === 'event' && item.date === '2026-09-09' && item.title.toLowerCase().includes('meetup')) {
      return (
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" asChild href={communityDayMeetup.agendaUrl}>
            View the agenda
          </Button>
          <Button variant="blue" asChild href={communityDayMeetup.rsvpUrl}>
            RSVP on Meetup
          </Button>
        </div>
      );
    }

    return undefined;
  };

  return (
    <>
      <SEO
        title="Schedule"
        description="Explore the ZurichJS Conf 2026 public schedule."
        canonical="/schedule"
        ogImage="/api/og/schedule"
        keywords="zurichjs schedule, conference schedule, workshop schedule, talk schedule"
      />

      <main className="min-h-screen bg-brand-white">
        <ShapedSection shape="straight" variant="dark" dropTop dropBottom>
          <Kicker variant="dark" className="block mt-10">
            September 9-12, 2026
          </Kicker>
          <Heading level="h1" variant="dark" className="mt-4 text-3xl font-bold leading-none">
            ZurichJS Conf 2026 Schedule
          </Heading>
          <p className="mt-6 max-w-screen-md text-lg text-brand-gray-light">
            Take a bird&#39;s-eye view of all learning opportunities, and the activities that make up the conf experience in Zurich.
          </p>
        </ShapedSection>

        <ShapedSection shape="straight" variant="light" dropTop dropBottom compact>
          <div className="mx-auto max-w-screen-lg">
            <DayTabs
              tabs={publicProgramTabs.map((tab) => ({
                id: tab.id,
                label: tab.label,
                date: tab.date,
              }))}
              activeTab={activeTab}
              onTabChange={(tabId) => {
                const nextTab = tabId as (typeof publicProgramTabs)[number]['id'];
                if (nextTab === activeTab) return;

                analytics.track('schedule_tab_changed', {
                  selected_tab: nextTab,
                  previous_tab: activeTab,
                  tab_location: '/schedule',
                } as EventProperties<'schedule_tab_changed'>);
                void setDayParam(scheduleTabToDayParam[nextTab]);
              }}
              className="pt-0"
            />

            <div className="mt-8 flex flex-col gap-4">
              {visibleItems.length > 0 ? (
                visibleItems.map((item, index) => (
                  <ProgramScheduleItemCard
                    key={item.id}
                    item={item}
                    defaultOpen={index === 0}
                    placeholderVariant="plain"
                    expandableSessions
                    eventActions={getEventActions(item)}
                    eventLink={item.id === warmupChillRunScheduleItem.id
                      ? { label: 'Info and RSVP', href: warmupChillRun.rsvpUrl }
                      : undefined}
                    offeringsBySubmissionId={workshopsData?.offeringsBySubmissionId}
                  />
                ))
              ) : activeTab === 'community' ? null : (
                <PlaceholderCard
                  id={`schedule-${activeScheduleTab.id}-tba`}
                  title="To be announced"
                  startTime={null}
                  durationMinutes={0}
                  variant="plain"
                />
              )}
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="straight" variant="dark" compact>
          <div className="mx-auto max-w-screen-lg">
            <Kicker variant="dark" className="mb-4">
              Meet The Lineup
            </Kicker>
            <Heading level="h2" variant="dark" className="text-lg sm:text-2xl font-bold leading-tight">
              Explore the speakers behind the sessions
            </Heading>
            <p className="mt-6 max-w-2xl text-base leading-8 text-brand-gray-light">
              Once you spot a session you like, head over to the speakers page to get more context on the people bringing the ideas, stories, and hands-on experience to the conference.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="primary" asChild href="/speakers">
                See all speakers
              </Button>
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="straight" variant="medium" compact>
          <div className="mx-auto max-w-screen-lg">
            <Kicker variant="dark" className="mb-4">
              Join Us
            </Kicker>
            <Heading level="h2" variant="dark" className="text-lg sm:text-2xl font-bold leading-tight">
              Get your ticket and plan your conference week
            </Heading>
            <p className="mt-6 max-w-2xl text-base leading-8 text-brand-gray-light">
              Use the public schedule to decide how you want to spend your time, then secure your spot for the talks, the workshops, and the people you want to meet in person.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="primary" asChild href="/#tickets">
                Get your ticket
              </Button>
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="straight" variant="dark" compact>
          <div className="mx-auto max-w-screen-lg">
            <Kicker variant="dark" className="mb-4">
              Bring Your Team
            </Kicker>
            <Heading level="h2" variant="dark" className="text-lg sm:text-2xl font-bold leading-tight">
              Want to bring your team or support the conference?
            </Heading>
            <p className="mt-6 max-w-2xl text-base leading-8 text-brand-gray-light">
              Sponsorship helps us make the conference possible and gives companies a strong way to support learning, visibility, and shared team experiences across workshops and talks.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="blue" asChild href="/sponsorship">
                Bring your team
              </Button>
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="straight" variant="dark" compactTop>
          <SiteFooter showContactLinks />
        </ShapedSection>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<SchedulePageProps> = async (ctx) => {
  ctx.res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');

  const { speakers } = await fetchPublicSpeakers();
  const rows = await getPublicScheduleRows();
  const items = buildPublicProgramScheduleItems(rows, speakers);

  return {
    props: {
      items,
    },
  };
};
