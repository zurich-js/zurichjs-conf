import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import { SEO } from '@/components/SEO';
import { Button, Heading, Kicker } from '@/components/atoms';
import { DayTabs, SessionCard } from '@/components/molecules';
import { ShapedSection, SiteFooter } from '@/components/organisms';
import { scheduleData } from '@/data';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import type { PublicSession } from '@/lib/types/cfp';

interface SchedulePageProps {
  sessions: Array<PublicSession & {
    speaker: {
      name: string;
      role: string;
      imageUrl: string | null;
    };
  }>;
}

const scheduleTabs = [
  { id: 'community', label: 'Community day', date: 'September 9, 2026', sessionDate: null },
  { id: 'warmup', label: 'Workshop day', date: 'September 10, 2026', sessionDate: '2026-09-10' },
  { id: 'conference', label: 'Conference day', date: 'September 11, 2026', sessionDate: '2026-09-11' },
  { id: 'post-conference', label: 'Post-conf day', date: 'September 12, 2026', sessionDate: null },
] as const;

export default function SchedulePage({ sessions }: SchedulePageProps) {
  const [activeTab, setActiveTab] = useState<(typeof scheduleTabs)[number]['id']>('community');
  const activeScheduleTab = scheduleTabs.find((tab) => tab.id === activeTab) ?? scheduleTabs[0];
  const visibleSessions = activeScheduleTab.sessionDate
    ? sessions.filter((session) => session.schedule?.date === activeScheduleTab.sessionDate)
    : [];
  const activeDay = scheduleData.days.find((day) => day.id === activeTab);
  const showEventSchedule = !activeScheduleTab.sessionDate;

  return (
    <>
      <SEO
        title="Schedule"
        description="Explore the ZurichJS Conf 2026 public schedule."
        canonical="/schedule"
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
              tabs={scheduleTabs.map((tab) => ({
                id: tab.id,
                label: tab.label,
                date: tab.date,
              }))}
              activeTab={activeTab}
              onTabChange={(tabId) => setActiveTab(tabId as (typeof scheduleTabs)[number]['id'])}
              className="pt-0"
            />

            <div className="mt-8 flex flex-col gap-4">
              {showEventSchedule && activeDay ? (
                <div className="flex flex-col gap-4">
                  {activeDay.description ? (
                    <div className="rounded-[1.25rem] border border-brand-gray-lightest bg-brand-gray-lightest p-5">
                      <Heading level="h2" variant="light" className="text-lg font-bold">
                        {activeDay.label}
                      </Heading>
                      <p className="mt-3 text-sm leading-7 text-brand-gray-darkest">
                        {activeDay.description}
                      </p>
                    </div>
                  ) : null}

                  {activeDay.events.map((event) => (
                    <div key={`${activeDay.id}-${event.time}-${event.title}`} className="rounded-[1.25rem] border border-brand-gray-lightest bg-brand-gray-lightest p-5">
                      <p className="text-sm text-brand-gray-medium">{event.time}</p>
                      <h3 className="mt-1 text-lg font-bold leading-tight text-brand-black">{event.title}</h3>
                      <p className="mt-4 text-sm leading-7 text-brand-gray-darkest">{event.description}</p>
                    </div>
                  ))}
                </div>
              ) : visibleSessions.length > 0 ? (
                visibleSessions.map((session, index) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    speaker={session.speaker}
                    expandable
                    defaultOpen={index === 0}
                    href={session.type === 'workshop' ? `/workshops/${session.slug}` : `/talks/${session.slug}`}
                  />
                ))
              ) : (
                <div className="p-4">
                  <Heading level="h2" variant="light" className="text-lg font-bold">
                    Sessions are still being finalized
                  </Heading>
                  <p className="mt-3 text-sm leading-7 text-brand-gray-darkest">
                    We do not have public sessions for this day yet. Check back in later.
                  </p>
                </div>
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

export const getServerSideProps: GetServerSideProps<SchedulePageProps> = async () => {
  const { speakers } = await fetchPublicSpeakers();
  const sessions = speakers
    .flatMap((speaker) =>
      speaker.sessions.map((session) => ({
        ...session,
        speaker: {
          name: [speaker.first_name, speaker.last_name].filter(Boolean).join(' '),
          role: [speaker.job_title, speaker.company].filter(Boolean).join(' @ '),
          imageUrl: speaker.profile_image_url,
        },
      }))
    )
    .filter((session) => session.schedule?.date === '2026-09-10' || session.schedule?.date === '2026-09-11')
    .sort((left, right) => {
      const leftDate = `${left.schedule?.date ?? '9999-12-31'}T${left.schedule?.start_time ?? '23:59:59'}`;
      const rightDate = `${right.schedule?.date ?? '9999-12-31'}T${right.schedule?.start_time ?? '23:59:59'}`;

      if (leftDate !== rightDate) {
        return leftDate.localeCompare(rightDate);
      }

      if (left.type !== right.type && left.schedule?.start_time === right.schedule?.start_time) {
        return left.type === 'workshop' ? -1 : 1;
      }

      return left.title.localeCompare(right.title);
    });

  return {
    props: {
      sessions,
    },
  };
};
