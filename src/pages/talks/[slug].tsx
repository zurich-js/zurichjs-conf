import type { GetServerSideProps } from 'next';
import { SEO } from '@/components/SEO';
import { Button, Heading, Kicker } from '@/components/atoms';
import { ShapedSection, SiteFooter } from '@/components/organisms';
import { SessionCard, SessionDetailHero, type SessionDetailSpeaker } from '@/components/scheduling';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import type { PublicSession } from '@/lib/types/cfp';

interface TalkDetailPageProps {
  session: PublicSession;
  speaker: SessionDetailSpeaker;
}

export default function TalkDetailPage({ session, speaker }: TalkDetailPageProps) {
  return (
    <>
      <SEO
        title={session.title}
        description={`Talk details for ${session.title}.`}
        canonical={`/talks/${session.slug}`}
        ogImage={`/api/og/talks/${session.slug}`}
        keywords={`zurichjs talk, ${session.title}`}
      />

      <main className="min-h-screen bg-brand-white">
        <SessionDetailHero session={session} kind="talk" ctaHref="/#tickets" ctaLabel="Get your ticket" />

        <ShapedSection shape="straight" variant="light" dropTop dropBottom>
          <div className="mx-auto max-w-screen-lg">
            <SessionCard
              session={session}
              speaker={{
                name: speaker.name,
                role: speaker.role,
                imageUrl: speaker.avatarUrl,
                slug: speaker.slug,
              }}
              speakers={session.speakers}
              showDuration
              actionMode="detail"
              className="rounded-none border-0 bg-transparent p-0"
            />
          </div>
        </ShapedSection>

        <ShapedSection shape="straight" variant="medium">
          <div className="mx-auto max-w-screen-lg">
            <Kicker variant="dark" className="mb-4">
              Keep Exploring
            </Kicker>
            <Heading level="h2" variant="dark" className="text-lg sm:text-2xl font-bold leading-tight">
              Discover more of the lineup
            </Heading>
            <p className="mt-6 max-w-2xl text-base leading-8 text-brand-gray-light">
              Browse the full talks overview and meet the speakers joining us at ZurichJS Conf.
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
  const speaker = speakers.find((entry) =>
    entry.sessions.some((session) => (session.type === 'standard' || session.type === 'lightning') && session.slug === slug)
  );
  const session = speaker?.sessions.find((entry) => (entry.type === 'standard' || entry.type === 'lightning') && entry.slug === slug);

  if (!session || !speaker) {
    return { notFound: true };
  }

  return {
    props: {
      session,
      speaker: {
        name: [speaker.first_name, speaker.last_name].filter(Boolean).join(' '),
        slug: speaker.slug,
        avatarUrl: speaker.profile_image_url,
        role: [speaker.job_title, speaker.company].filter(Boolean).join(' @ ') || null,
      },
    },
  };
};
