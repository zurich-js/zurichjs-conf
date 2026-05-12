/**
 * Public Volunteer Role Detail Page
 * Full role details with apply CTA
 */

import { useState } from 'react';
import { ArrowLeft, Clock, MapPin, Calendar, Users, Check, X } from 'lucide-react';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { SEO, generateBreadcrumbSchema } from '@/components/SEO';
import { SiteFooter, ShapedSection } from '@/components/organisms';
import { Heading, Kicker, Button } from '@/components/atoms';
import { VolunteerApplicationModal } from '@/components/molecules/VolunteerApplicationModal';
import { VolunteerApplicationSuccess } from '@/components/molecules/VolunteerApplicationSuccess';
import { getRoleBySlug } from '@/lib/volunteer';
import {
  COMMITMENT_TYPE_LABELS,
  getPublicRoleDisplayStatus,
} from '@/lib/volunteer/status';
import type { VolunteerRole, VolunteerCommitmentType } from '@/lib/types/volunteer';

function TextList({ title, content }: { title: string; content: string | null }) {
  if (!content) return null;
  const items = content.split('\n').filter(Boolean);
  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-brand-gray-darkest mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="text-brand-primary mt-0.5">&#8226;</span>
            {item.replace(/^[-•]\s*/, '')}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BenefitsList({ title, items, icon, color }: {
  title: string;
  items: string[];
  icon: 'check' | 'x';
  color: string;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-2">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            {icon === 'check' ? (
              <Check className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
            ) : (
              <X className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
            )}
            {item.replace(/^[-•]\s*/, '')}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface VolunteerRolePageProps {
  role: VolunteerRole;
}

export default function VolunteerRolePage({ role }: VolunteerRolePageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const displayStatus = getPublicRoleDisplayStatus(role);
  const canApply = displayStatus !== 'closed';

  const includedBenefits = role.included_benefits?.split('\n').filter(Boolean) || [];
  const excludedBenefits = role.excluded_benefits?.split('\n').filter(Boolean) || [];

  const handleApplicationSuccess = (appId: string) => {
    setApplicationId(appId);
    setIsModalOpen(false);
    setIsSuccessOpen(true);
  };

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Volunteer', url: '/volunteer' },
    { name: role.title, url: `/volunteer/${role.slug}` },
  ]);

  return (
    <>
      <SEO
        title={`${role.title} | Volunteer at ZurichJS Conf 2026`}
        description={role.summary || `Apply to volunteer as ${role.title} at ZurichJS Conf 2026.`}
        canonical={`/volunteer/${role.slug}`}
        ogType="website"
        jsonLd={breadcrumbSchema}
      />

      <main className="min-h-screen">
        {/* Hero */}
        <ShapedSection shape="down" variant="dark" dropTop>
          <Link href="/volunteer" className="inline-flex items-center gap-1.5 text-sm text-brand-gray-light hover:text-white transition-colors mb-6 mt-32 sm:mt-36">
            <ArrowLeft className="w-4 h-4" />
            All volunteer roles
          </Link>

          <Kicker variant="dark">Volunteer Role</Kicker>
          <Heading level="h1" variant="dark">{role.title}</Heading>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm text-brand-gray-light">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {COMMITMENT_TYPE_LABELS[role.commitment_type as VolunteerCommitmentType]}
            </span>
            {role.location_context && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {role.location_context}
              </span>
            )}
            {role.show_spots_publicly && role.spots_available && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {role.spots_available} spot{role.spots_available !== 1 ? 's' : ''} available
              </span>
            )}
            {role.application_deadline && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Apply by {new Date(role.application_deadline).toLocaleDateString('en-CH', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </span>
            )}
          </div>

          {role.summary && (
            <p className="text-lg text-brand-gray-light mt-6 max-w-2xl leading-relaxed">
              {role.summary}
            </p>
          )}

          {canApply && (
            <div className="mt-6">
              <Button variant="primary" size="lg" onClick={() => setIsModalOpen(true)}>
                Apply Now
              </Button>
            </div>
          )}
        </ShapedSection>

        {/* Content */}
        <ShapedSection shape="down" variant="light">
          <div className="max-w-3xl mx-auto space-y-6">
            {role.description && (
              <div>
                <h3 className="text-lg font-semibold text-brand-gray-darkest mb-2">About the Role</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {role.description}
                </p>
              </div>
            )}

            <TextList title="Responsibilities" content={role.responsibilities} />
            <TextList title="Requirements" content={role.requirements} />
            <TextList title="Nice to Have" content={role.nice_to_haves} />

            {role.availability_requirements && (
              <div>
                <h3 className="text-lg font-semibold text-brand-gray-darkest mb-2">Availability</h3>
                <p className="text-sm text-gray-700">{role.availability_requirements}</p>
              </div>
            )}

            {/* Benefits */}
            {(includedBenefits.length > 0 || excludedBenefits.length > 0 || role.benefits) && (
              <div>
                <h3 className="text-lg font-semibold text-brand-gray-darkest mb-3">What&apos;s Included</h3>
                {role.benefits && (
                  <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{role.benefits}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <BenefitsList
                    title="Included"
                    items={includedBenefits}
                    icon="check"
                    color="text-green-500"
                  />
                  <BenefitsList
                    title="Not Included"
                    items={excludedBenefits}
                    icon="x"
                    color="text-red-400"
                  />
                </div>
              </div>
            )}

            {/* Application Process */}
            <div>
              <h3 className="text-lg font-semibold text-brand-gray-darkest mb-3">How it works</h3>
              <ol className="space-y-3">
                {[
                  { step: '1', text: 'Submit your application using the form on this page.' },
                  { step: '2', text: 'Our team reviews every application and gets back to you via email.' },
                  { step: '3', text: 'If selected, we\u2019ll confirm details, responsibilities, and next steps.' },
                  { step: '4', text: 'You\u2019re in! We\u2019ll onboard you before the event and stay in touch.' },
                ].map((item) => (
                  <li key={item.step} className="flex items-start gap-3 text-sm text-gray-700">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-brand-primary text-black flex items-center justify-center text-xs font-bold">
                      {item.step}
                    </span>
                    {item.text}
                  </li>
                ))}
              </ol>
            </div>

            {/* Apply CTA */}
            {canApply && (
              <div className="max-w-xl mx-auto bg-brand-gray-darkest rounded-2xl px-6 py-8 sm:px-10 text-center">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Ready to join the team?
                </h3>
                <p className="text-brand-gray-light mb-5 text-sm">
                  If this role sounds like a fit, we&apos;d love to hear from you.
                </p>
                <Button variant="primary" size="lg" onClick={() => setIsModalOpen(true)}>
                  Apply for This Role
                </Button>
              </div>
            )}
          </div>
        </ShapedSection>

        {/* Footer */}
        <ShapedSection shape="down" variant="dark" compactTop dropBottom>
          <SiteFooter />
        </ShapedSection>
      </main>

      <VolunteerApplicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        roleId={role.id}
        roleTitle={role.title}
        hasExclusions={excludedBenefits.length > 0}
        onSuccess={handleApplicationSuccess}
      />

      <VolunteerApplicationSuccess
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        applicationId={applicationId}
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<VolunteerRolePageProps> = async ({ params }) => {
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const { data: role } = await getRoleBySlug(slug);

  if (!role) {
    return { notFound: true };
  }

  return { props: { role } };
};
