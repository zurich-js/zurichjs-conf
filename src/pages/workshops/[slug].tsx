import { useEffect, useRef } from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { SEO } from '@/components/SEO';
import { Button, Heading, Kicker } from '@/components/atoms';
import { ShapedSection, SiteFooter } from '@/components/organisms';
import { SessionCard, SessionDetailHero, type SessionDetailSpeaker } from '@/components/scheduling';
import { WorkshopPurchasePanel } from '@/components/workshops/WorkshopPurchasePanel';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import { trackWorkshopViewed } from '@/lib/analytics';
import type { PublicSession } from '@/lib/types/cfp';
import { ChevronLeft } from 'lucide-react';

interface WorkshopDetailPageProps {
  session: PublicSession;
  speaker: SessionDetailSpeaker;
}

export default function WorkshopDetailPage({ session, speaker }: WorkshopDetailPageProps) {
  const hasTrackedView = useRef(false);
  useEffect(() => {
    if (hasTrackedView.current) return;
    hasTrackedView.current = true;
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
        ogImage={`/api/og/workshops/${session.slug}`}
        keywords={`zurichjs workshop, ${session.title}`}
      />

      <main className="min-h-screen bg-brand-white">
        <SessionDetailHero session={session} kind="workshop" ctaHref="#purchase" ctaLabel="Buy workshop seat" />

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
            <WorkshopPurchasePanel
              sessionId={session.id}
              cfpSubmissionId={session.cfp_submission_id}
              sessionSlug={session.slug}
              title={session.title}
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
              Want more hands-on sessions, or a lighter conference day? Browse the rest of the workshops and talks.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
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
