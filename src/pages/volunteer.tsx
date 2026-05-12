/**
 * Public Volunteer Job Board
 * Browse open volunteer roles and apply
 */

import { ArrowRight, Calendar, MapPin, Clock, Users } from 'lucide-react';
import Link from 'next/link';
import { SEO, generateBreadcrumbSchema } from '@/components/SEO';
import { SiteFooter, ShapedSection } from '@/components/organisms';
import { SectionContainer } from '@/components/organisms/SectionContainer';
import { Heading, Kicker } from '@/components/atoms';
import { usePublicVolunteerRoles } from '@/hooks/useVolunteer';
import {
  COMMITMENT_TYPE_LABELS,
  getPublicRoleDisplayStatus,
  PUBLIC_DISPLAY_STATUS_LABELS,
  getPublicDisplayStatusTone,
} from '@/lib/volunteer/status';
import type { VolunteerRole, VolunteerCommitmentType } from '@/lib/types/volunteer';
import type { PublicRoleDisplayStatus } from '@/lib/volunteer/status';

function RoleStatusBadge({ status }: { status: PublicRoleDisplayStatus }) {
  const tone = getPublicDisplayStatusTone(status);
  const colors = {
    green: 'bg-green-100 text-green-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[tone]}`}>
      {PUBLIC_DISPLAY_STATUS_LABELS[status]}
    </span>
  );
}

function VolunteerRoleCard({ role }: { role: VolunteerRole }) {
  const displayStatus = getPublicRoleDisplayStatus(role);
  const isClosed = displayStatus === 'closed';
  const includedList = role.included_benefits?.split('\n').filter(Boolean) || [];

  return (
    <Link
      href={`/volunteer/${role.slug}`}
      className={`group block bg-white rounded-2xl border border-gray-200 p-6 transition-all ${
        isClosed ? 'opacity-60' : 'hover:border-brand-primary hover:shadow-lg hover:-translate-y-0.5'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold text-brand-gray-darkest group-hover:text-brand-blue transition-colors">
          {role.title}
        </h3>
        <RoleStatusBadge status={displayStatus} />
      </div>

      {role.summary && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{role.summary}</p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-4">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {COMMITMENT_TYPE_LABELS[role.commitment_type as VolunteerCommitmentType]}
        </span>
        {role.location_context && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {role.location_context}
          </span>
        )}
        {role.show_spots_publicly && role.spots_available && (
          <span className="inline-flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {role.spots_available} spot{role.spots_available !== 1 ? 's' : ''}
          </span>
        )}
        {role.application_deadline && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Apply by {new Date(role.application_deadline).toLocaleDateString('en-CH', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {includedList.length > 0 && (
        <ul className="space-y-1 mb-4">
          {includedList.slice(0, 3).map((benefit, i) => (
            <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
              <span className="text-green-500 mt-0.5">&#10003;</span>
              {benefit}
            </li>
          ))}
          {includedList.length > 3 && (
            <li className="text-xs text-gray-400">+{includedList.length - 3} more</li>
          )}
        </ul>
      )}

      {!isClosed && (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue group-hover:gap-2 transition-all">
          Learn More & Apply
          <ArrowRight className="w-4 h-4" />
        </span>
      )}
    </Link>
  );
}

export default function VolunteerPage() {
  const { data: roles, isLoading } = usePublicVolunteerRoles();

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Volunteer', url: '/volunteer' },
  ]);

  return (
    <>
      <SEO
        title="Volunteer | Join the Team Behind ZurichJS Conf 2026"
        description="Help make ZurichJS Conf 2026 a great experience. Browse open volunteer roles, see what's included, and apply to join the team behind the event."
        canonical="/volunteer"
        ogType="website"
        keywords="zurichjs volunteer, javascript conference volunteer, zurich tech volunteer, conference volunteer opportunities"
        jsonLd={breadcrumbSchema}
      />

      <main className="min-h-screen">
        {/* Hero Section */}
        <ShapedSection shape="widen" variant="dark" dropTop className="mt-8!">
          <div className="max-w-3xl">
            <Kicker variant="dark" animate>Volunteer with us</Kicker>
            <Heading level="h1" variant="dark" animate>
              Help us build something great
            </Heading>
            <p className="text-lg text-brand-gray-light mt-4 leading-relaxed max-w-2xl">
              ZurichJS Conf is a community-driven event, and every great conference
              needs great people behind it. We&apos;re looking for motivated, community-minded
              folks who want to be part of something meaningful.
            </p>
            <p className="text-brand-gray-medium mt-3">
              Browse the open roles below, see what&apos;s involved, and apply where you
              feel you&apos;d be a great fit. We believe in being upfront about expectations,
              benefits, and what&apos;s not included.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Meaningful roles</h3>
                <p className="text-brand-gray-light text-sm leading-relaxed">
                  Every role comes with clear responsibilities. You&apos;ll know exactly
                  what&apos;s expected, so you can show up prepared and make a real difference.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">No surprises</h3>
                <p className="text-brand-gray-light text-sm leading-relaxed">
                  Each listing is transparent about what&apos;s included &mdash; conference access,
                  food, merch &mdash; and what&apos;s not, like travel or accommodation.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Be part of the crew</h3>
                <p className="text-brand-gray-light text-sm leading-relaxed">
                  Work alongside the organizing team, get behind-the-scenes access,
                  and connect with speakers and the wider JavaScript community in Zurich.
                </p>
              </div>
            </div>
          </div>
        </ShapedSection>

        {/* Roles Section */}
        <ShapedSection shape="tighten" variant="light">
          <div className="mb-6">
            <Kicker variant="light" animate>Open Roles</Kicker>
            <Heading level="h2" variant="light" animate>
              See where you can make an impact
            </Heading>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
                  <div className="h-6 w-48 bg-gray-100 rounded mb-3" />
                  <div className="h-4 w-full bg-gray-100 rounded mb-2" />
                  <div className="h-4 w-3/4 bg-gray-100 rounded mb-4" />
                  <div className="flex gap-3">
                    <div className="h-5 w-24 bg-gray-100 rounded" />
                    <div className="h-5 w-20 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : !roles || roles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-500">
                No volunteer roles are currently open.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Check back soon &mdash; we&apos;ll be posting roles as the conference gets closer.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {roles.map((role) => (
                <VolunteerRoleCard key={role.id} role={role} />
              ))}
            </div>
          )}
        </ShapedSection>

        {/* Contact + Footer */}
        <ShapedSection shape="widen" variant="dark" dropBottom disableContainer>
          <SectionContainer>
            <div className="text-center pb-4">
              <Heading level="h3" variant="dark" animate>
                Got questions?
              </Heading>
              <p className="text-brand-gray-light mt-2">
                Drop us a line at{' '}
                <a href="mailto:hello@zurichjs.com" className="text-brand-primary hover:underline">
                  hello@zurichjs.com
                </a>
                {' '}&mdash; we&apos;re happy to chat.
              </p>
            </div>
          </SectionContainer>
          <SiteFooter />
        </ShapedSection>
      </main>
    </>
  );
}
