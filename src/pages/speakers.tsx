import React from 'react';
import { SEO } from '@/components/SEO';
import { SpeakerCard } from '@/components/molecules';

const demoAvatar = '/images/meetups/nico.jpg';
const demoHeader = '/images/meetups/cloudflare.png';

export default function SpeakersPage() {
  return (
    <>
      <SEO
        title="Speakers"
        description="Preview the public speaker card variants for ZurichJS Conference."
        canonical="/speakers"
        keywords="zurichjs speakers, speaker cards, conference speakers"
      />
      <main className="min-h-screen bg-[linear-gradient(180deg,#f7f7f4_0%,#ecece6_100%)] px-6 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-blue">Speaker Cards</p>
            <h1 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">Public speaker card variants</h1>
            <p className="mt-4 text-base leading-relaxed text-gray-700">
              Demo page for the upcoming public speaker listing. Each card is fully clickable and shows a different
              presentation mode using the same component API.
            </p>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-3 lg:items-start">
            <SpeakerCard
              variant="compact"
              avatar={demoAvatar}
              name="Daniel Roe"
              title="Nuxt Team Lead @ Vercel"
              to="/speakers#compact"
            />

            <SpeakerCard
              variant="default"
              header={demoHeader}
              avatar={demoAvatar}
              name="Daniel Roe"
              title="Nuxt Team Lead"
              footer="React at the Edge: Building a Framework from Scratch"
              to="/speakers#default"
            />

            <SpeakerCard
              variant="full"
              header={demoHeader}
              avatar={demoAvatar}
              name="Daniel Roe"
              title="Nuxt Team Lead"
              footer="React at the Edge: Building a Framework from Scratch"
              to="/speakers#full"
            />
          </div>
        </div>
      </main>
    </>
  );
}
