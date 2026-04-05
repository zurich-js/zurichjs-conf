import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import { SEO } from '@/components/SEO';
import { Button, Heading, Kicker } from '@/components/atoms';
import { DayTabs, SessionCard } from '@/components/molecules';
import { ShapedSection, SiteFooter } from '@/components/organisms';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import type { PublicSession } from '@/lib/types/cfp';

interface WorkshopsPageProps {
  sessions: Array<PublicSession & {
    speaker: {
      name: string;
      role: string;
      imageUrl: string | null;
    };
  }>;
}

export default function WorkshopsPage({ sessions }: WorkshopsPageProps) {
  const [activeTab, setActiveTab] = useState('morning');

  const visibleSessions = sessions.filter((session) => {
    const hour = Number(session.schedule?.start_time?.slice(0, 2) ?? '0');

    if (activeTab === 'morning') {
      return hour < 13;
    }

    if (activeTab === 'lunch') {
      return hour >= 13 && hour < 14;
    }

    return hour >= 14;
  });

  return (
    <>
      <SEO
        title="Workshops"
        description="Explore ZurichJS Conf 2026 workshops."
        canonical="/workshops"
        keywords="zurichjs workshops, engineering day workshops, zurichjs conf workshops"
      />

      <main className="min-h-screen bg-brand-white">
        <ShapedSection shape="straight" variant="dark" dropTop dropBottom className="relative">
          <Heading level="h1" variant="dark" className="max-md:mt-10 text-2xl md:text-3xl font-bold leading-none">
            Zurich Engineering Day
          </Heading>
          <p className="mt-4 text-base md:text-md">
            September 10, 2026
          </p>
          <p className="mt-16 max-w-screen-md text-lg md:text-xl font-bold">
              Accelerate your learning with a full day of workshops for Software Engineers from all domains.
          </p>

          <p className="text-brand-gray-light absolute bottom-4 sm:bottom-10 md:bottom-20">Organized by the ZurichJS team.</p>
        </ShapedSection>

        <ShapedSection shape="straight" variant="light" dropTop dropBottom>
          <div className="mx-auto max-w-screen-lg">
            <DayTabs
              tabs={[
                { id: 'morning', label: 'Morning sessions', date: '09:00 - 13:00' },
                { id: 'lunch', label: 'Lunch break', date: '13:00 - 14:00' },
                { id: 'afternoon', label: 'Afternoon sessions', date: '14:00 - 18:00' },
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              color="blue"
              className="pt-0"
            />

            <div className="mt-8 flex flex-col gap-4">
              {visibleSessions.length > 0 ? (
                visibleSessions.map((session, index) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    speaker={session.speaker}
                    expandable
                    defaultOpen={index === 0}
                    href={`/workshops/${session.slug}`}
                  />
                ))
              ) : (
                <div className="p-4">
                  <Heading level="h2" variant="light" className="text-lg font-bold">
                    More workshops are coming
                  </Heading>
                  <p className="mt-3 text-sm leading-7 text-brand-gray-darkest">
                    We have not published the workshops for this time block yet. Check back in later.
                  </p>
                </div>
              )}
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="straight" variant="dark">
          <div className="mx-auto max-w-screen-lg">
            <Kicker variant="dark" className="mb-4">
              Supercharge learning
            </Kicker>
            <Heading level="h2" variant="dark" className="text-lg sm:text-2xl font-bold leading-tight">
              Pair your conference experience with a workshop day
            </Heading>
            <p className="mt-6 max-w-2xl text-base leading-8 text-brand-gray-light">
              Workshops are designed as a focused add-on for attendees who want more hands-on time with the speakers and topics they care about most.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="primary" asChild href="/#tickets">
                Get your ticket
              </Button>
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="straight" variant="medium">
          <div className="mx-auto max-w-screen-lg">
            <Heading level="h2" variant="dark" className="text-lg sm:text-2xl font-bold leading-tight">
              Enable learning for everyone
            </Heading>
            {/* TODO(feature/speakers-grid): Replace this temporary workshops supporting copy with final sponsorship/CFP messaging. */}
            <p className="mt-6 text-base leading-8 text-brand-gray-light">
              By sponsoring the conference, you not only help us build a great experience for everyone, but you also receive workshop seats to either bring your team to the conference or help support learning at the latest industry standards for those who need it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="blue" asChild href="/sponsorship">
                Sponsor the conference
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

export const getServerSideProps: GetServerSideProps<WorkshopsPageProps> = async () => {
  const { speakers } = await fetchPublicSpeakers();
  const sessions = speakers
    .flatMap((speaker) =>
      speaker.sessions
        .filter((session) => session.type === 'workshop')
        .map((session) => ({
          ...session,
          speaker: {
            name: [speaker.first_name, speaker.last_name].filter(Boolean).join(' '),
            role: [speaker.job_title, speaker.company].filter(Boolean).join(' @ '),
            imageUrl: speaker.profile_image_url,
          },
        }))
    )
    .sort((left, right) => {
      const leftDate = `${left.schedule?.date ?? '9999-12-31'}T${left.schedule?.start_time ?? '23:59:59'}`;
      const rightDate = `${right.schedule?.date ?? '9999-12-31'}T${right.schedule?.start_time ?? '23:59:59'}`;

      if (leftDate !== rightDate) {
        return leftDate.localeCompare(rightDate);
      }

      return left.title.localeCompare(right.title);
    });

  return {
    props: {
      sessions,
    },
  };
};
