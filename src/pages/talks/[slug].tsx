import type { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import { SEO } from '@/components/SEO';
import { Button, Heading, Kicker } from '@/components/atoms';
import { ShapedSection, SiteFooter } from '@/components/organisms';
import { SessionCard, SessionDetailHero, type SessionDetailSpeaker } from '@/components/scheduling';
import { getFrozenSpeakers } from '@/lib/archive/frozen';
import type { PublicSession } from '@/lib/types/cfp';
import { ChevronLeft } from 'lucide-react';
import { NEXT_EDITION_URL } from '@/lib/archive/config';

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
        keywords={`zurichjs talk, ${session.title}`}
      />

      <main className="min-h-screen bg-brand-white">
        <SessionDetailHero session={session} kind="talk" ctaHref={NEXT_EDITION_URL} ctaLabel="Get your ticket" />

        <ShapedSection shape="straight" variant="light" dropTop dropBottom>
          <div className="mx-auto max-w-screen-lg">
            <Link
              href="/talks"
              className="mb-5 inline-flex items-center gap-1 text-xs font-medium text-brand-gray-medium transition-colors hover:text-brand-black"
            >
              <ChevronLeft className="size-3.5" aria-hidden="true" />
              All talks
            </Link>
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
              <Button variant="primary" asChild href={NEXT_EDITION_URL}>
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

/** Every archived talk is known at build time, so the set of pages is closed. */
export const getStaticPaths: GetStaticPaths = () => {
  const { speakers } = getFrozenSpeakers();
  const slugs = new Set<string>();

  for (const speaker of speakers) {
    for (const session of speaker.sessions) {
      if (session.type === 'standard' || session.type === 'lightning') {
        slugs.add(session.slug);
      }
    }
  }

  return {
    paths: [...slugs].map((slug) => ({ params: { slug } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<TalkDetailPageProps> = async (ctx) => {
  const slug = typeof ctx.params?.slug === 'string' ? ctx.params.slug : '';
  const { speakers } = getFrozenSpeakers();
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
