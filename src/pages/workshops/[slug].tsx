import { useEffect, useRef } from 'react';
import type { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import { SEO } from '@/components/SEO';
import { Button, Heading, Kicker } from '@/components/atoms';
import { ShapedSection, SiteFooter } from '@/components/organisms';
import { SessionCard, SessionDetailHero, type SessionDetailSpeaker } from '@/components/scheduling';
import { getFrozenSpeakers } from '@/lib/archive/frozen';
import { trackWorkshopViewed } from '@/lib/analytics';
import type { PublicSession } from '@/lib/types/cfp';
import { ChevronLeft } from 'lucide-react';
import { NEXT_EDITION_URL } from '@/lib/archive/config';

interface WorkshopDetailPageProps {
  session: PublicSession;
  speaker: SessionDetailSpeaker;
}

export default function WorkshopDetailPage({ session, speaker }: WorkshopDetailPageProps) {
  const lastTrackedId = useRef<string | null>(null);
  useEffect(() => {
    if (lastTrackedId.current === session.id) return;
    lastTrackedId.current = session.id;
    trackWorkshopViewed({
      workshopId: session.id,
      workshopTitle: session.title,
      workshopInstructor: speaker.name,
    });
  }, [session.id, session.title, speaker.name]);

  return (
    <>
      <SEO
        title={session.title}
        description={`Workshop details for ${session.title}.`}
        canonical={`/workshops/${session.slug}`}
        keywords={`zurichjs workshop, ${session.title}`}
      />

      <main className="min-h-screen bg-brand-white">
        <SessionDetailHero session={session} kind="workshop" ctaHref="/workshops" ctaLabel="All 2026 workshops" />

        <ShapedSection shape="straight" variant="light" dropTop dropBottom compact>
          <div className="mx-auto max-w-screen-lg space-y-6">
            <Link
              href="/workshops"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-gray-medium transition-colors hover:text-brand-black"
            >
              <ChevronLeft className="size-3.5" aria-hidden="true" />
              All workshops
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

        <ShapedSection shape="straight" variant="medium" compact>
          <div className="mx-auto max-w-screen-lg">
            <Kicker variant="dark" className="mb-3">
              Keep Exploring
            </Kicker>
            <Heading level="h2" variant="dark" className="text-lg sm:text-2xl font-bold leading-tight">
              Browse the rest of the program
            </Heading>
            <p className="mt-4 max-w-2xl text-base leading-8 text-brand-gray-light">
              Want more hands-on sessions, or a lighter conference day? Browse the rest of the
              workshops and talks — the conference follows on September 11 at the same venue, and
              VIP tickets include 20% off all workshops, including this one.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="primary" asChild href={NEXT_EDITION_URL}>
                See conference tickets
              </Button>
              <Button variant="blue" asChild href="/workshops">
                See other workshops
              </Button>
              <Button variant="black" asChild href="/talks">
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

/** Every archived workshop is known at build time, so the set of pages is closed. */
export const getStaticPaths: GetStaticPaths = () => {
  const { speakers } = getFrozenSpeakers();
  const slugs = new Set<string>();

  for (const speaker of speakers) {
    for (const session of speaker.sessions) {
      if (session.type === 'workshop') slugs.add(session.slug);
    }
  }

  return {
    paths: [...slugs].map((slug) => ({ params: { slug } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<WorkshopDetailPageProps> = async (ctx) => {
  const slug = typeof ctx.params?.slug === 'string' ? ctx.params.slug : '';
  const { speakers } = getFrozenSpeakers();
  const speaker = speakers.find((entry) =>
    entry.sessions.some((session) => session.type === 'workshop' && session.slug === slug)
  );
  const session = speaker?.sessions.find((entry) => entry.type === 'workshop' && entry.slug === slug);

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
