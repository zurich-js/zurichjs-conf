import type { GetServerSideProps } from 'next';
import React from 'react';
import { SEO } from '@/components/SEO';
import { Heading, Kicker } from '@/components/atoms';
import { SectionContainer, ShapedSection, SiteFooter } from '@/components/organisms';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import type { PublicSpeaker } from '@/lib/types/cfp';

interface SpeakerDetailPageProps {
  speaker: PublicSpeaker;
}

export default function SpeakerDetailPage({ speaker }: SpeakerDetailPageProps) {
  const fullName = [speaker.first_name, speaker.last_name].filter(Boolean).join(' ');
  const role = [speaker.job_title, speaker.company].filter(Boolean).join(' @ ');

  return (
    <>
      <SEO
        title={fullName}
        description={speaker.bio || `${fullName} at ZurichJS Conference.`}
        canonical={`/speakers/${speaker.slug}`}
        keywords={`zurichjs speaker, ${fullName}`}
      />

      <main className="min-h-screen bg-brand-white">
        <ShapedSection shape="straight" variant="dark" dropTop dropBottom>
          <div className="mx-auto max-w-5xl">
            <Kicker variant="dark" className="mb-4">
              Speaker
            </Kicker>
            <Heading level="h1" variant="dark" className="text-2xl font-bold">
              {fullName}
            </Heading>
            {role ? <p className="mt-4 max-w-2xl text-lg text-brand-gray-light">{role}</p> : null}
          </div>
        </ShapedSection>

        <SectionContainer>
          <div className="py-16 md:py-24">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <Kicker variant="light" className="mb-4">
                  TODO
                </Kicker>
                <Heading level="h2" variant="light" className="text-xl font-bold">
                  Speaker detail page is coming next
                </Heading>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-gray-darkest">
                  This placeholder route is live so speaker cards can already navigate to a stable public slug.
                  We&apos;ll replace this with the final speaker detail layout later.
                </p>
              </div>

              <aside className="rounded-3xl border border-brand-gray-light bg-brand-gray-lightest p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-blue">Public sessions</p>
                {speaker.sessions.length > 0 ? (
                  <div className="mt-6 space-y-4">
                    {speaker.sessions.map((session) => (
                      <div key={session.id} className="rounded-2xl bg-brand-white p-4">
                        <h3 className="font-bold text-brand-black">{session.title}</h3>
                        {session.tags.length > 0 ? (
                          <p className="mt-2 text-sm text-brand-gray-darkest">{session.tags.join(' · ')}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-brand-gray-darkest">No public sessions are attached to this speaker yet.</p>
                )}
              </aside>
            </div>
          </div>
        </SectionContainer>

        <ShapedSection shape="straight" variant="dark" compactTop>
          <SiteFooter showContactLinks />
        </ShapedSection>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<SpeakerDetailPageProps> = async ({ params }) => {
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const { speakers } = await fetchPublicSpeakers();
  const speaker = speakers.find((entry) => entry.slug === slug);

  if (!speaker) {
    return { notFound: true };
  }

  return {
    props: {
      speaker,
    },
  };
};
