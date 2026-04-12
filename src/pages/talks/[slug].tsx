import type { GetServerSideProps } from 'next';
import { SEO } from '@/components/SEO';
import { Button, Heading, Kicker } from '@/components/atoms';
import { ShapedSection, SiteFooter } from '@/components/organisms';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import type { PublicSession } from '@/lib/types/cfp';

interface TalkDetailPageProps {
  session: PublicSession;
}

export default function TalkDetailPage({ session }: TalkDetailPageProps) {
  return (
    <>
      <SEO
        title={session.title}
        description={`Talk details for ${session.title}.`}
        canonical={`/talks/${session.slug}`}
        keywords={`zurichjs talk, ${session.title}`}
      />

      <main className="min-h-screen bg-brand-white">
        <ShapedSection shape="straight" variant="dark" dropTop dropBottom>
          <Kicker variant="dark" className="mb-4">
            Talk Detail
          </Kicker>
          <Heading level="h1" variant="dark" className="text-2xl md:text-3xl font-bold leading-none">
            {session.title}
          </Heading>
          {/* TODO(feature/speakers-grid): Replace this placeholder talk detail hero with the final content and media layout. */}
          <p className="mt-6 max-w-3xl text-lg leading-8 text-brand-gray-light">
            This detail page is intentionally a placeholder for now while we finish the talks detail design and content.
          </p>
        </ShapedSection>

        <ShapedSection shape="straight" variant="light" dropTop dropBottom>
          <div className="mx-auto max-w-screen-lg">
            {/* TODO(feature/speakers-grid): Add the real talk detail content here once the final experience is ready. */}
            <p className="text-base leading-8 text-brand-gray-darkest">
              Talk detail content is coming soon.
            </p>
          </div>
        </ShapedSection>

        <ShapedSection shape="straight" variant="medium">
          <div className="mx-auto max-w-screen-lg">
            <Kicker variant="dark" className="mb-4">
              Keep Exploring
            </Kicker>
            <Heading level="h2" variant="dark" className="text-lg sm:text-2xl font-bold leading-tight">
              Discover more of the lineup while this talk page is still a placeholder
            </Heading>
            <p className="mt-6 max-w-2xl text-base leading-8 text-brand-gray-light">
              You can already browse the full talks overview and the speakers lineup while the final detail page treatment is still being built.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="primary" asChild href="/talks">
                See all talks
              </Button>
              <Button variant="blue" asChild href="/speakers">
                See all speakers
              </Button>
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="straight" variant="dark">
          <div className="mx-auto max-w-screen-lg">
            <Kicker variant="dark" className="mb-4">
              Join Us
            </Kicker>
            <Heading level="h2" variant="dark" className="text-lg sm:text-2xl font-bold leading-tight">
              Did you get your ticket yet?
            </Heading>
            <p className="mt-6 max-w-2xl text-base leading-8 text-brand-gray-light">
              The talks are better live. Get your ticket and plan your conference day around the sessions and people you want to spend time with.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="primary" asChild href="/#tickets">
                Get your ticket
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

export const getServerSideProps: GetServerSideProps<TalkDetailPageProps> = async ({ params }) => {
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const { speakers } = await fetchPublicSpeakers();
  const session = speakers
    .flatMap((speaker) => speaker.sessions)
    .find((entry) => entry.type !== 'workshop' && entry.slug === slug);

  if (!session) {
    return { notFound: true };
  }

  return {
    props: {
      session,
    },
  };
};
