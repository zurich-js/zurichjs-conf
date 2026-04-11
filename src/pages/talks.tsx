import type { GetServerSideProps } from 'next';
import { SEO } from '@/components/SEO';
import { Button, Heading, Kicker } from '@/components/atoms';
import { ProgramScheduleItemCard } from '@/components/scheduling';
import { ShapedSection, SiteFooter } from '@/components/organisms';
import { buildPublicProgramScheduleItems, getPublicScheduleRows } from '@/lib/program/schedule';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import type { PublicProgramScheduleItem } from '@/lib/types/program-schedule';

interface TalksPageProps {
  items: PublicProgramScheduleItem[];
}

export default function TalksPage({ items }: TalksPageProps) {
  const visibleItems = items.filter((item) =>
    item.date === '2026-09-11' &&
    (item.type === 'placeholder' || (item.type === 'session' && item.session_kind === 'talk'))
  );
  const firstPublishedIndex = visibleItems.findIndex((item) => item.type === 'session' && Boolean(item.session));

  return (
    <>
      <SEO
        title="Talks"
        description="Explore ZurichJS Conf 2026 talks."
        canonical="/talks"
        keywords="zurichjs talks, conference talks, zurichjs conf talks"
      />

      <main className="min-h-screen bg-brand-white">
        <ShapedSection shape="straight" variant="dark" dropTop dropBottom className="relative">
          <Heading level="h1" variant="dark" className="max-md:mt-10 text-2xl md:text-3xl font-bold leading-none">
            ZurichJS Conference Talks
          </Heading>
          <p className="mt-4 text-base md:text-md">
            September 11, 2026
          </p>
          {/* TODO(feature/speakers-grid): Replace this placeholder talks hero with the final public talks hero treatment. */}
          <p className="mt-16 max-w-screen-md text-lg md:text-xl font-bold">
            Browse the conference program and pick the sessions you want to build your day around.
          </p>
          <p className="text-brand-gray-light absolute bottom-4 sm:bottom-10 md:bottom-20">Curated by the ZurichJS team.</p>
        </ShapedSection>

        <ShapedSection shape="straight" variant="light" dropTop dropBottom>
          <div className="mx-auto flex max-w-screen-lg flex-col gap-4">
            {visibleItems.map((item, index) => (
              <ProgramScheduleItemCard
                key={item.id}
                item={item}
                defaultOpen={index === firstPublishedIndex}
                placeholderVariant="slot"
                expandableSessions
              />
            ))}
          </div>
        </ShapedSection>

        <ShapedSection shape="straight" variant="medium">
          <div className="mx-auto max-w-screen-lg">
            <Kicker variant="dark" className="mb-4">
              Supercharge Learning
            </Kicker>
            <Heading level="h2" variant="dark" className="text-lg sm:text-2xl font-bold leading-tight">
              Add workshop to go deeper with industry experts
            </Heading>
            <p className="mt-6 max-w-2xl text-base leading-8 text-brand-gray-light">
              Talks give you the broad conference experience. Workshops give you the focused, hands-on follow-up. Pairing both is the best way to turn inspiration into practice.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="blue" asChild href="/workshops">
                Explore workshops
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

export const getServerSideProps: GetServerSideProps<TalksPageProps> = async () => {
  const { speakers } = await fetchPublicSpeakers();
  const rows = await getPublicScheduleRows();
  const items = buildPublicProgramScheduleItems(rows, speakers);

  return {
    props: {
      items,
    },
  };
};
