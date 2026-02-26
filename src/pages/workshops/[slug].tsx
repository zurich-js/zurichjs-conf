/**
 * Workshop Detail Page
 * View full workshop details, instructor info, and book
 * Route: /workshops/[slug]
 */

import React, { useState } from 'react';
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { ShapedSection, DynamicSiteFooter, NavBar } from '@/components/organisms';
import { WorkshopDetailSection, WorkshopBookingCTA } from '@/components/workshops';
import { getWorkshopBySlug } from '@/lib/workshops';
import type { PublicWorkshop } from '@/lib/types/workshop';

interface WorkshopDetailPageProps {
  workshop: PublicWorkshop;
}

export default function WorkshopDetailPage({
  workshop,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [bookingLoading, setBookingLoading] = useState(false);

  const handleBook = async () => {
    setBookingLoading(true);
    try {
      const res = await fetch('/api/workshops/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshop_ids: [workshop.id],
          customer_info: {
            first_name: '',
            last_name: '',
            email: '',
            address_line1: '',
            city: '',
            postal_code: '',
            country: 'CH',
          },
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Booking error:', error);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleComboBook = async () => {
    setBookingLoading(true);
    try {
      const res = await fetch('/api/workshops/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshop_ids: [workshop.id],
          include_conference_ticket: true,
          customer_info: {
            first_name: '',
            last_name: '',
            email: '',
            address_line1: '',
            city: '',
            postal_code: '',
            country: 'CH',
          },
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Combo booking error:', error);
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <>
      <SEO
        title={`${workshop.title} - Workshop | ZurichJS Conference 2026`}
        description={workshop.short_abstract}
        canonical={`/workshops/${workshop.slug}`}
        ogType="website"
      />
      <main className="min-h-screen">
        <NavBar />

        <ShapedSection shape="tighten" variant="dark" dropTop>
          {/* Back link */}
          <div className="mb-6">
            <Link
              href="/workshops"
              className="inline-flex items-center gap-2 text-sm text-brand-gray-light hover:text-brand-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to all workshops
            </Link>
          </div>

          {/* Detail Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <WorkshopDetailSection workshop={workshop} />
            </div>
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <WorkshopBookingCTA
                  workshop={workshop}
                  loading={bookingLoading}
                  onBook={handleBook}
                  onComboBook={handleComboBook}
                />
              </div>
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="widen" variant="dark" dropBottom>
          <DynamicSiteFooter />
        </ShapedSection>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<WorkshopDetailPageProps> = async (context) => {
  const slug = context.params?.slug;
  if (!slug || typeof slug !== 'string') {
    return { notFound: true };
  }

  const result = await getWorkshopBySlug(slug);
  if (!result.success || !result.workshop) {
    return { notFound: true };
  }

  return {
    props: {
      workshop: result.workshop,
    },
  };
};
