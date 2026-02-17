/**
 * Workshops Page (Zurich Engineering Day)
 * Public-facing page showing all published workshops grouped by time slot.
 * Fetches workshop data server-side for SEO.
 */

import React, { useRef } from 'react';
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { SEO } from '@/components/SEO';
import { ShapedSection, DynamicSiteFooter, NavBar } from '@/components/organisms';
import { WorkshopHero, WorkshopSchedule } from '@/components/workshops';
import { getPublishedWorkshops } from '@/lib/workshops';
import type { PublicWorkshop } from '@/lib/types/workshop';

interface WorkshopsPageProps {
  workshops: PublicWorkshop[];
}

export default function WorkshopsPage({
  workshops,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const scheduleRef = useRef<HTMLDivElement>(null);

  const handleBrowseClick = () => {
    scheduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <SEO
        title="Workshops - Zurich Engineering Day | ZurichJS Conference 2026"
        description="Join hands-on workshops at Zurich Engineering Day, September 10, 2026. Full-day immersive sessions on React, TypeScript, Node.js and more. Led by industry experts."
        canonical="/workshops"
        ogType="website"
        keywords="javascript workshops zurich, react workshop, typescript training, node.js workshop, web development workshop, zurich engineering day"
      />
      <main className="min-h-screen">
        <NavBar />

        {/* Hero */}
        <ShapedSection shape="tighten" variant="dark" dropTop>
          <WorkshopHero onBrowseClick={handleBrowseClick} />
        </ShapedSection>

        {/* Workshop Schedule */}
        <ShapedSection shape="widen" variant="medium" id="workshops">
          <div ref={scheduleRef}>
            <WorkshopSchedule workshops={workshops} />
          </div>
        </ShapedSection>

        {/* Info Section */}
        <ShapedSection shape="tighten" variant="yellow">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-black mb-4">
              How It Works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
              <div>
                <div className="w-8 h-8 rounded-full bg-brand-black text-brand-yellow-main flex items-center justify-center font-bold text-sm mb-2">
                  1
                </div>
                <h3 className="font-semibold text-brand-black mb-1">Choose your workshops</h3>
                <p className="text-sm text-brand-black/70">
                  Pick a morning and/or afternoon session. No time conflicts allowed.
                </p>
              </div>
              <div>
                <div className="w-8 h-8 rounded-full bg-brand-black text-brand-yellow-main flex items-center justify-center font-bold text-sm mb-2">
                  2
                </div>
                <h3 className="font-semibold text-brand-black mb-1">Book with your ticket</h3>
                <p className="text-sm text-brand-black/70">
                  A conference ticket is required. Bundle ticket + workshop for 10% off.
                </p>
              </div>
              <div>
                <div className="w-8 h-8 rounded-full bg-brand-black text-brand-yellow-main flex items-center justify-center font-bold text-sm mb-2">
                  3
                </div>
                <h3 className="font-semibold text-brand-black mb-1">Show up and learn</h3>
                <p className="text-sm text-brand-black/70">
                  Bring your laptop, arrive on time, and get hands-on with the experts.
                </p>
              </div>
            </div>
          </div>
        </ShapedSection>

        {/* Footer */}
        <ShapedSection shape="widen" variant="dark" dropBottom>
          <DynamicSiteFooter />
        </ShapedSection>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<WorkshopsPageProps> = async () => {
  const result = await getPublishedWorkshops();

  return {
    props: {
      workshops: result.workshops || [],
    },
  };
};
