import { useState } from 'react';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { SEO } from '@/components/SEO';
import { Button, Heading, Kicker } from '@/components/atoms';
import { DayTabs } from '@/components/molecules';
import { ShapedSection, SiteFooter } from '@/components/organisms';
import { PlaceholderCard, ProgramScheduleItemCard } from '@/components/scheduling';
import { communityDayMeetup, publicProgramTabs } from '@/data';
import { buildPublicProgramScheduleItems, getPublicScheduleRows } from '@/lib/program/schedule';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import type { PublicProgramScheduleItem } from '@/lib/types/program-schedule';

interface SchedulePageProps {
  items: PublicProgramScheduleItem[];
  initialTab: (typeof publicProgramTabs)[number]['id'];
}

const scheduleDayParamToTab = {
  community: 'community',
  workshop: 'warmup',
  conf: 'conference',
  'post-conf': 'post-conference',
} as const;

const scheduleTabToDayParam: Record<(typeof publicProgramTabs)[number]['id'], string> = {
  community: 'community',
  warmup: 'workshop',
  conference: 'conf',
  'post-conference': 'post-conf',
};

export default function SchedulePage({ items, initialTab }: SchedulePageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<(typeof publicProgramTabs)[number]['id']>(initialTab);
  const activeScheduleTab = publicProgramTabs.find((tab) => tab.id === activeTab) ?? publicProgramTabs[0];
  const visibleItems = activeScheduleTab.sessionDate
    ? items.filter((item) => item.date === activeScheduleTab.sessionDate)
    : items.filter((item) => item.date === (activeTab === 'community' ? '2026-09-09' : '2026-09-12'));

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
        <ShapedSection shape="straight" variant="dark" dropTop dropBottom className="relative">
          <Heading level="h1" variant="dark" className="max-md:mt-10 text-2xl md:text-3xl font-bold leading-none">
            ZurichJS Conf 2026 Schedule
          </Heading>
          <p className="mt-4 text-base md:text-md">
            September 9-12, 2026
          </p>
          <p className="mt-16 max-w-screen-md text-lg md:text-xl font-bold">
            Take a bird&#39;s-eye view of all learning opportunities, and the activities that make up the conf experience in Zurich.
          </p>
        </ShapedSection>

        <ShapedSection shape="straight" variant="light" dropTop dropBottom>
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
                const nextDayParam = scheduleTabToDayParam[nextTab];

                setActiveTab(nextTab);
                void router.replace(
                  {
                    pathname: '/schedule',
                    query: nextDayParam === 'community' ? {} : { day: nextDayParam },
                  },
                  undefined,
                  { shallow: true, scroll: false }
                );
              }}
              className="pt-0"
            />

            {activeTab === 'community' && (
              <div className="mt-8 rounded-lg bg-brand-gray-lightest p-6">
                <Heading level="h3" variant="light" className="text-base font-bold leading-tight">
                  ZurichJS September Meetup
                </Heading>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-brand-gray-medium">
                  Community Day kicks off with the ZurichJS meetup on September 9 — free and open to
                  everyone. Check out the agenda and RSVP to save your spot.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button variant="primary" asChild href={communityDayMeetup.agendaUrl}>
                    View the agenda
                  </Button>
                  <Button variant="blue" asChild href={communityDayMeetup.rsvpUrl}>
                    RSVP on Meetup
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-4">
              {visibleItems.length > 0 ? (
                visibleItems.map((item, index) => (
                  <ProgramScheduleItemCard
                    key={item.id}
                    item={item}
                    defaultOpen={index === 0}
                    placeholderVariant="plain"
                    expandableSessions
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

        <ShapedSection shape="straight" variant="dark">
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

        <ShapedSection shape="straight" variant="medium">
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

        <ShapedSection shape="straight" variant="dark">
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
  const requestedDay = typeof ctx.query.day === 'string' ? ctx.query.day : null;
  const initialTab = requestedDay && requestedDay in scheduleDayParamToTab
    ? scheduleDayParamToTab[requestedDay as keyof typeof scheduleDayParamToTab]
    : 'community';

  return {
    props: {
      items,
      initialTab,
    },
  };
};
