import type { GetServerSideProps } from 'next';
import { SEO } from '@/components/SEO';
import { Button, Heading, Kicker } from '@/components/atoms';
import { ShapedSection, SiteFooter } from '@/components/organisms';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import type { PublicSession } from '@/lib/types/cfp';

interface WorkshopDetailPageProps {
  session: PublicSession;
}

export default function WorkshopDetailPage({ session }: WorkshopDetailPageProps) {
  return (
    <>
      <SEO
        title={session.title}
        description={`Workshop details for ${session.title}.`}
        canonical={`/workshops/${session.slug}`}
        keywords={`zurichjs workshop, ${session.title}`}
      />

      <main className="min-h-screen bg-brand-white">
        <ShapedSection shape="straight" variant="dark" dropTop dropBottom className="relative">
          <Kicker variant="dark" className="mb-4">
            Workshop Detail
          </Kicker>
          <Heading level="h1" variant="dark" className="text-2xl md:text-3xl font-bold leading-none">
            {session.title}
          </Heading>
          {/* TODO(feature/speakers-grid): Replace this placeholder workshop detail hero with the final content and media layout. */}
          <p className="mt-6 max-w-3xl text-lg leading-8 text-brand-gray-light">
            This detail page is intentionally a placeholder for now while we finish the workshop detail design and content.
          </p>
        </ShapedSection>

        <ShapedSection shape="straight" variant="light" dropTop dropBottom>
          <div className="mx-auto max-w-screen-lg">
            {/* TODO(feature/speakers-grid): Add the real workshop detail content here once the final experience is ready. */}
            <p className="text-base leading-8 text-brand-gray-darkest">
              Workshop details are coming soon.
            </p>
          </div>
        </ShapedSection>

        <ShapedSection shape="straight" variant="medium">
          <div className="mx-auto max-w-screen-lg">
            <Kicker variant="dark" className="mb-4">
              Keep Exploring
            </Kicker>
            <Heading level="h2" variant="dark" className="text-lg sm:text-2xl font-bold leading-tight">
              Browse the rest of the program while this page is still taking shape
            </Heading>
            <p className="mt-6 max-w-2xl text-base leading-8 text-brand-gray-light">
              Use the public pages to discover the other workshops and the conference talks that pair well with this session.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="blue" asChild href="/workshops">
                See other workshops
              </Button>
              <Button variant="primary" asChild href="/talks">
                Discover conference talks
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

export const getServerSideProps: GetServerSideProps<WorkshopDetailPageProps> = async ({ params }) => {
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const { speakers } = await fetchPublicSpeakers();
  const session = speakers
    .flatMap((speaker) => speaker.sessions)
    .find((entry) => entry.type === 'workshop' && entry.slug === slug);

  if (!session) {
    return { notFound: true };
  }

  return {
    props: {
      session,
    },
  };
};
