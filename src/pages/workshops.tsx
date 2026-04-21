import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { SEO } from '@/components/SEO';
import { Button, Heading, Kicker } from '@/components/atoms';
import { DayTabs } from '@/components/molecules';
import { ShapedSection, SiteFooter } from '@/components/organisms';
import { ProgramScheduleItemCard } from '@/components/scheduling';
import { workshopProgramSections } from '@/data';
import { useCurrency } from '@/contexts/CurrencyContext';
import { createWorkshopsScheduleQueryOptions } from '@/lib/queries/workshops';
import type { PublicProgramScheduleItem } from '@/lib/types/program-schedule';

const DAY_DATE = '2026-09-10';

function filterDay(items: PublicProgramScheduleItem[]) {
  return items.filter((item) => item.date === DAY_DATE);
}

function partitionByTab(items: PublicProgramScheduleItem[]) {
  const dayItems = filterDay(items);
  return {
    morning: dayItems.filter(
      (item) => Number(item.start_time.slice(0, 2)) < 13 && item.type !== 'break'
    ),
    lunch: dayItems.filter(
      (item) => item.type === 'break' && Number(item.start_time.slice(0, 2)) === 13
    ),
    afternoon: dayItems.filter(
      (item) => Number(item.start_time.slice(0, 2)) >= 14 && item.type !== 'event'
    ),
  };
}

export default function WorkshopsPage() {
  const [activeTab, setActiveTab] = useState('morning');
  const { currency } = useCurrency();

  const queryOptions = useMemo(
    () => createWorkshopsScheduleQueryOptions(currency),
    [currency]
  );
  const { data, isLoading, isError, refetch, isFetching } = useQuery(queryOptions);

  const partitioned = useMemo(
    () => (data ? partitionByTab(data.items) : null),
    [data]
  );

  const visibleItems =
    partitioned
      ? activeTab === 'morning'
        ? partitioned.morning
        : activeTab === 'afternoon'
          ? partitioned.afternoon
          : partitioned.lunch
      : [];

  const firstPublishedIndex = visibleItems.findIndex(
    (item) => item.type === 'session' && Boolean(item.session)
  );

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
            <p className="mt-4 text-base md:text-md">September 10, 2026</p>
            <p className="mt-16 max-w-screen-md text-lg md:text-xl font-bold">
              Accelerate your learning with a full day of workshops for Software Engineers from all domains.
            </p>
            <p className="text-brand-gray-light absolute bottom-4 sm:bottom-10 md:bottom-20">
              Organized by the ZurichJS team.
            </p>
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
              {isLoading && <ScheduleSkeleton />}
              {isError && (
                <ScheduleError onRetry={() => refetch()} isRetrying={isFetching} />
              )}
              {data && visibleItems.length === 0 && !isLoading && (
                <p className="rounded-xl border border-brand-gray-lightest bg-brand-white p-6 text-center text-sm text-brand-gray-medium">
                  No published workshops in this slot yet — check back soon.
                </p>
              )}
              {data &&
                visibleItems.map((item, index) => (
                  <ProgramScheduleItemCard
                    key={item.id}
                    item={item}
                    defaultOpen={index === firstPublishedIndex}
                    placeholderVariant={activeTab === 'lunch' ? 'slot' : 'plain'}
                    expandableSessions
                    offeringsBySubmissionId={data.offeringsBySubmissionId}
                  />
                ))}
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="straight" variant="dark">
          <div className="mx-auto max-w-screen-lg px-10">
            <Kicker variant="dark" className="mb-4">Supercharge learning</Kicker>
            <Heading level="h2" variant="dark" className="text-lg sm:text-2xl font-bold leading-tight">
              Pair your conference experience with a workshop day
            </Heading>
            <p className="mt-6 max-w-2xl text-base leading-8 text-brand-gray-light">
              Workshops are designed as a focused add-on for attendees who want more hands-on time with the speakers and topics they care about most.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="primary" asChild href="/#tickets">
                Add the conference too
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

function ScheduleSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading workshop schedule">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[1.25rem] border border-brand-gray-lightest bg-brand-gray-lightest p-5 animate-pulse"
        >
          <div className="h-3 w-20 rounded bg-brand-gray-light/60" />
          <div className="mt-3 h-5 w-3/4 rounded bg-brand-gray-light/70" />
          <div className="mt-4 flex gap-3">
            <div className="h-3 w-28 rounded bg-brand-gray-light/50" />
            <div className="h-3 w-24 rounded bg-brand-gray-light/50" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ScheduleError({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <div className="rounded-xl border border-brand-red/20 bg-brand-red/5 p-6 text-center">
      <p className="text-sm font-medium text-brand-black">Could not load the workshop schedule.</p>
      <div className="mt-4">
        <Button variant="blue" size="sm" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? 'Retrying…' : 'Try again'}
        </Button>
      </div>
    </div>
  );
}
