import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import { SEO } from '@/components/SEO';
import { Button, Heading, Kicker } from '@/components/atoms';
import { DayTabs } from '@/components/molecules';
import { ShapedSection, SiteFooter } from '@/components/organisms';
import { ProgramScheduleItemCard } from '@/components/scheduling';
import { workshopProgramSections } from '@/data';
import { buildPublicProgramScheduleItems, getPublicScheduleRows } from '@/lib/program/schedule';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import type { PublicProgramScheduleItem } from '@/lib/types/program-schedule';

interface WorkshopsPageProps {
  items: PublicProgramScheduleItem[];
}

export default function WorkshopsPage({ items }: WorkshopsPageProps) {
  const [activeTab, setActiveTab] = useState('morning');
  const dayItems = items.filter((item) =>
    item.date === '2026-09-10' &&
    (
      (item.type === 'session' && item.session_kind === 'workshop' && Boolean(item.session)) ||
      item.type === 'placeholder' ||
      (item.type === 'session' && !item.session)
    )
  );
  const morningItems = dayItems.filter((item) => Number(item.start_time.slice(0, 2)) < 13 && item.type !== 'break');
  const lunchItems = dayItems.filter((item) => item.type === 'break' && Number(item.start_time.slice(0, 2)) === 13);
  const afternoonItems = dayItems.filter((item) => Number(item.start_time.slice(0, 2)) >= 14 && item.type !== 'event');
  const visibleItems = activeTab === 'morning' ? morningItems : activeTab === 'afternoon' ? afternoonItems : lunchItems;
  const firstPublishedIndex = visibleItems.findIndex((item) => item.type === 'session' && Boolean(item.session));

  return (
    <>
      <SEO
        title="Workshops"
        description="Explore ZurichJS Conf 2026 workshops."
        canonical="/workshops"
        ogImage="/api/og/workshops"
        keywords="zurichjs workshops, engineering day workshops, zurichjs conf workshops"
      />

      <main className="min-h-screen bg-brand-white">
        <ShapedSection shape="straight" variant="dark" dropTop dropBottom className="relative px-10">
          <div className="px-10">
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
          </div>
        </ShapedSection>

        <ShapedSection shape="straight" variant="light" dropTop dropBottom>
          <div className="mx-auto max-w-screen-lg px-10">
            <DayTabs
              tabs={workshopProgramSections.map((section) => ({
                id: section.id,
                label: section.label,
                date: section.date,
              }))}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              color="blue"
              className="pt-0"
            />

            <div className="mt-8 flex flex-col gap-4">
              {visibleItems.map((item, index) => (
                <ProgramScheduleItemCard
                  key={item.id}
                  item={item}
                  defaultOpen={index === firstPublishedIndex}
                  placeholderVariant="plain"
                  expandableSessions
                />
              ))}
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="straight" variant="dark">
          <div className="mx-auto max-w-screen-lg px-10">
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
          <div className="mx-auto max-w-screen-lg px-10">
            <Heading level="h2" variant="dark" className="text-lg sm:text-2xl font-bold leading-tight">
              Enable learning for everyone
            </Heading>
            <p className="mt-6 text-base leading-8 text-brand-gray-light">
              Sponsorship helps us make Zurich Engineering Day accessible to more people. Partner packages include workshop seats for your team and can help fund learning opportunities for attendees who would otherwise miss out.
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
  const rows = await getPublicScheduleRows();
  const items = buildPublicProgramScheduleItems(rows, speakers);
  const hasWorkshops = items.some((item) => item.type === 'session' && item.session_kind === 'workshop' && Boolean(item.session));

  if (!hasWorkshops) {
    return {
      redirect: {
        destination: '/speakers',
        permanent: false,
      },
    };
  }

  return {
    props: {
      items,
    },
  };
};
