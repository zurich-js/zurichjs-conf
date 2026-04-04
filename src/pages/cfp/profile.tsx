/**
 * CFP Speaker Profile Page
 * Edit speaker profile information
 */

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { ChevronLeft, Check, AlertCircle } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/atoms';
import { useToast } from '@/contexts/ToastContext';
import { createSupabaseServerClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { getMissingProfileFields } from '@/lib/cfp/auth-constants';
import { getSubmissionsBySpeakerId } from '@/lib/cfp/submissions';
import { speakerProfileSchema, type SpeakerProfileFormData } from '@/lib/validations/cfp';
import { isEuropeanCountry } from '@/lib/constants/countries';
import type { CfpSpeaker } from '@/lib/types/cfp';
import {
  PersonalInfoSection,
  TravelSection,
  SupportSection,
  ConferenceDetailsSection,
  PhotoUploadCard,
  SocialLinksCard,
  SpeakerCardPreviewModal,
  type TravelOption,
} from '@/components/cfp/profile';

interface ProfileProps {
  speaker: CfpSpeaker;
  requiresHeaderImage: boolean;
}

export default function CfpProfile({ speaker, requiresHeaderImage }: ProfileProps) {
  const router = useRouter();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(speaker.profile_image_url);
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(speaker.header_image_url);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewVariant, setPreviewVariant] = useState<'compact' | 'default' | 'full'>('default');

  const [formData, setFormData] = useState<SpeakerProfileFormData>({
    first_name: speaker.first_name || '',
    last_name: speaker.last_name || '',
    email: speaker.email,
    job_title: speaker.job_title || '',
    company: speaker.company || '',
    city: speaker.city || '',
    country: speaker.country || '',
    bio: speaker.bio || '',
    linkedin_url: speaker.linkedin_url || '',
    github_url: speaker.github_url || '',
    twitter_handle: speaker.twitter_handle || '',
    bluesky_handle: speaker.bluesky_handle || '',
    mastodon_handle: speaker.mastodon_handle || '',
    tshirt_size: speaker.tshirt_size || null,
    travel_option: speaker.travel_option || null,
    travel_assistance_required: speaker.travel_assistance_required || false,
    assistance_type: speaker.assistance_type || null,
    departure_airport: speaker.departure_airport || null,
    special_requirements: speaker.special_requirements || '',
    company_interested_in_sponsoring: speaker.company_interested_in_sponsoring || false,
  });

  const [travelOption, setTravelOption] = useState<TravelOption | null>(() => {
    if (speaker.travel_option) return speaker.travel_option as TravelOption;
    // Fallback for speakers without travel_option set yet
    if (speaker.travel_assistance_required === true) return 'need_assistance';
    if (speaker.travel_assistance_required === false) return 'self_managed';
    return null;
  });

  const isEuropean = useMemo(() => formData.country ? isEuropeanCountry(formData.country) : false, [formData.country]);
  const missingFields = useMemo(
    () =>
      getMissingProfileFields(
        {
          ...speaker,
          ...formData,
          profile_image_url: profileImageUrl,
          header_image_url: headerImageUrl,
        },
        { requiresHeaderImage }
      ),
    [formData, headerImageUrl, profileImageUrl, requiresHeaderImage, speaker]
  );
  const previewName = useMemo(() => {
    const fullName = [formData.first_name, formData.last_name].filter(Boolean).join(' ').trim();
    return fullName || 'Your name';
  }, [formData.first_name, formData.last_name]);
  const previewTitle = useMemo(() => {
    const parts = [formData.job_title, formData.company].filter(Boolean);
    return parts.length > 0 ? parts.join(' @ ') : undefined;
  }, [formData.company, formData.job_title]);

  const handleChange = (field: keyof SpeakerProfileFormData, value: string | boolean | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
    setSuccessMessage(null);
  };

  const handleTravelOptionChange = (option: TravelOption) => {
    setTravelOption(option);
    handleChange('travel_option', option);
    if (option === 'employer_covers' || option === 'self_managed') {
      handleChange('travel_assistance_required', false);
      handleChange('assistance_type', null);
      handleChange('departure_airport', null);
    } else {
      handleChange('travel_assistance_required', true);
    }
  };

  // Scroll to first error
  useEffect(() => {
    const errorKeys = Object.keys(errors).filter(key => key !== '_form');
    if (errorKeys.length === 0) return;
    const errorElement = document.getElementById(errorKeys[0]);
    if (errorElement) {
      const yOffset = -100;
      const y = errorElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setTimeout(() => errorElement.focus(), 500);
    }
  }, [errors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage(null);

    const result = speakerProfileSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/cfp/speaker', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile');

      setSuccessMessage('Profile updated successfully!');
      toast.success('Profile Saved', 'Your speaker profile has been updated.');

      if (!speaker.first_name || !speaker.last_name || !speaker.bio) {
        setTimeout(() => router.push('/cfp/dashboard'), 1500);
      }
    } catch (err) {
      setErrors({ _form: err instanceof Error ? err.message : 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO title="Edit Profile | CFP" description="Update your speaker profile for ZurichJS Conf 2026" noindex />

      <div className="min-h-screen bg-brand-gray-darkest">
        {/* Header */}
        <header className="border-b border-brand-gray-dark">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/cfp/dashboard" className="flex items-center gap-3">
              <Image width={40} height={40} src="/images/logo/zurichjs-square.png" alt="ZurichJS" className="h-10 w-10" />
              <span className="text-white font-semibold">CFP</span>
            </Link>
            <Link href="/cfp/dashboard" className="text-brand-gray-light hover:text-white text-sm transition-colors inline-flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8 max-w-2xl">
            <h1 className="text-3xl font-bold text-white mb-3">Your speaker profile</h1>
            <p className="text-brand-gray-light">
              Provide us the details we require to ensure a smooth experience both for yourself as well as our conference attendees. If there&apos;s anything missing, don&apos;t hesitate to let us know.
            </p>
          </div>

          {/* Alerts */}
          {missingFields.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 max-w-2xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-400 mb-1">Profile Incomplete</h3>
                  <p className="text-sm text-amber-200/80 mb-2">Please complete the following required profile fields:</p>
                  <ul className="text-sm text-amber-200/80 list-disc list-inside">
                    {missingFields.map((field) => <li key={field}>{field}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 max-w-2xl">
              <div className="flex items-center gap-2 text-green-400"><Check className="w-5 h-5" /><span className="font-medium">{successMessage}</span></div>
            </div>
          )}

          {errors._form && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 max-w-2xl">
              <div className="flex items-center gap-2 text-red-400"><AlertCircle className="w-5 h-5" /><span className="font-medium">{errors._form}</span></div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <PhotoUploadCard
              title="Profile photo"
              description="Upload a professional photo for the conference website. Preferably at least 600x600 pixels."
              initialImageUrl={speaker.profile_image_url}
              uploadEndpoint="/api/cfp/speaker/image"
              successToastTitle="Photo Updated"
              successToastDescription="Your profile picture has been saved."
              variant="mobile"
              onUploadSuccess={setProfileImageUrl}
            />

            <PhotoUploadCard
              title={`Header photo${requiresHeaderImage ? ' *' : ''}`}
              description="Upload a wide banner image for your public speaker card. A landscape image works best."
              initialImageUrl={speaker.header_image_url}
              uploadEndpoint="/api/cfp/speaker/header-image"
              successToastTitle="Header Updated"
              successToastDescription="Your speaker card header image has been saved."
              previewVariant="banner"
              variant="mobile"
              onUploadSuccess={setHeaderImageUrl}
            />

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Main Content */}
              <div className="flex-1 space-y-8 min-w-0">
                <PersonalInfoSection formData={formData} errors={errors} handleChange={handleChange} />
                <TravelSection formData={formData} errors={errors} handleChange={handleChange} travelOption={travelOption} onTravelOptionChange={handleTravelOptionChange} isEuropean={isEuropean} />
                <SupportSection formData={formData} errors={errors} handleChange={handleChange} />
                <ConferenceDetailsSection formData={formData} errors={errors} handleChange={handleChange} />
              </div>

              {/* Sidebar */}
              <div className="lg:w-80 flex-shrink-0 space-y-6">
                <div className="lg:sticky lg:top-8 space-y-6">
                  <PhotoUploadCard
                    title="Profile photo"
                    description="Upload a professional photo for the conference website. Preferably at least 600x600 pixels."
                    initialImageUrl={speaker.profile_image_url}
                    uploadEndpoint="/api/cfp/speaker/image"
                    successToastTitle="Photo Updated"
                    successToastDescription="Your profile picture has been saved."
                    variant="desktop"
                    onUploadSuccess={setProfileImageUrl}
                  />
                  <PhotoUploadCard
                    title={`Header photo${requiresHeaderImage ? ' *' : ''}`}
                    description="Upload a banner image for your public speaker card. AR 5:2, aligned to the bottom."
                    initialImageUrl={speaker.header_image_url}
                    uploadEndpoint="/api/cfp/speaker/header-image"
                    successToastTitle="Header Updated"
                    successToastDescription="Your speaker card header image has been saved."
                    previewVariant="banner"
                    variant="desktop"
                    onUploadSuccess={setHeaderImageUrl}
                  />
                  <div className="w-full flex items-center justify-center">
                      <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => setIsPreviewOpen(true)}
                      >
                          Preview speaker card
                      </Button>
                  </div>
                  <SocialLinksCard formData={formData} errors={errors} handleChange={handleChange} />

                  {/* Actions Card */}
                  <div className="bg-brand-gray-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
                    <div className="space-y-3">
                      <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
                        {isSubmitting ? 'Saving...' : 'Save changes'}
                      </Button>
                      <Button
                        href="mailto:hello@zurichjs.com?subject=CFP%20Question"
                        variant="ghost"
                        className="w-full"
                      >
                        Contact the team
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </main>
      </div>

      <SpeakerCardPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        variant={previewVariant}
        onVariantChange={setPreviewVariant}
        speaker={{
          name: previewName,
          title: previewTitle,
          avatar: profileImageUrl,
          header: headerImageUrl,
          footer: 'Lorem ipsum',
        }}
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<ProfileProps> = async (ctx) => {
  const supabaseServer = createSupabaseServerClient(ctx);
  const { data: { session }, error: sessionError } = await supabaseServer.auth.getSession();

  if (sessionError || !session) {
    return { redirect: { destination: '/cfp/login', permanent: false } };
  }

  const speaker = await getSpeakerByUserId(session.user.id);

  if (!speaker) {
    return { redirect: { destination: '/cfp/login', permanent: false } };
  }

  const { submissions } = await getSubmissionsBySpeakerId(speaker.id);
  const requiresHeaderImage = submissions.some((submission) => ['shortlisted', 'accepted'].includes(submission.status));

  return { props: { speaker, requiresHeaderImage } };
};
