/**
 * CFP Speaker Profile Page
 * Edit speaker profile information
 */

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { ChevronLeft, Check, AlertCircle, User, Image } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Button, Heading, Input } from '@/components/atoms';
import { createSupabaseServerClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { speakerProfileSchema, TSHIRT_SIZES, type SpeakerProfileFormData } from '@/lib/validations/cfp';
import type { CfpSpeaker, CfpTshirtSize } from '@/lib/types/cfp';

interface ProfileProps {
  speaker: CfpSpeaker;
}

export default function CfpProfile({ speaker }: ProfileProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Image upload state
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(speaker.profile_image_url);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageSuccess, setImageSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<SpeakerProfileFormData>({
    first_name: speaker.first_name || '',
    last_name: speaker.last_name || '',
    email: speaker.email,
    job_title: speaker.job_title || '',
    company: speaker.company || '',
    bio: speaker.bio || '',
    linkedin_url: speaker.linkedin_url || '',
    github_url: speaker.github_url || '',
    twitter_handle: speaker.twitter_handle || '',
    bluesky_handle: speaker.bluesky_handle || '',
    mastodon_handle: speaker.mastodon_handle || '',
    tshirt_size: speaker.tshirt_size || null,
    company_interested_in_sponsoring: speaker.company_interested_in_sponsoring || null,
  });

  const handleChange = (field: keyof SpeakerProfileFormData, value: string | boolean | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    setSuccessMessage(null);
  };

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setImageError('Invalid file type. Accepted formats: JPG, PNG, WebP, GIF');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setImageError('File too large. Maximum size is 5MB');
      return;
    }

    setIsUploadingImage(true);
    setImageError(null);
    setImageSuccess(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/cfp/speaker/image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      setProfileImageUrl(data.imageUrl);
      setImageSuccess('Profile picture updated!');

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage(null);

    // Validate form data
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

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccessMessage('Profile updated successfully!');

      // If this was the first time completing profile, redirect to dashboard
      if (!speaker.first_name || !speaker.last_name || !speaker.bio) {
        setTimeout(() => {
          router.push('/cfp/dashboard');
        }, 1500);
      }
    } catch (err) {
      setErrors({
        _form: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO
        title="Edit Profile | CFP"
        description="Update your speaker profile for ZurichJS Conf 2026"
        noindex
      />

      <div className="min-h-screen bg-brand-gray-darkest">
        {/* Header */}
        <header className="border-b border-brand-gray-dark">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/cfp/dashboard" className="flex items-center gap-3">
              <img
                src="/images/logo/zurichjs-square.png"
                alt="ZurichJS"
                className="h-10 w-10"
              />
              <span className="text-white font-semibold">CFP</span>
            </Link>
            <Link
              href="/cfp/dashboard"
              className="text-brand-gray-light hover:text-white text-sm transition-colors inline-flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="mb-8">
            <Heading level="h1" className="text-2xl font-bold text-white mb-2">
              Speaker Profile
            </Heading>
            <p className="text-brand-gray-light">
              This information will be displayed on the conference website if your talk is accepted.
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-5 h-5" />
                <span className="font-medium">{successMessage}</span>
              </div>
            </div>
          )}

          {/* Form Error */}
          {errors._form && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{errors._form}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <section className="bg-brand-gray-dark rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-semibold text-white mb-2">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    placeholder="John"
                    fullWidth
                    error={errors.first_name}
                  />
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-semibold text-white mb-2">
                    Last Name <span className="text-red-400">*</span>
                  </label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    placeholder="Doe"
                    fullWidth
                    error={errors.last_name}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                  Email <span className="text-red-400">*</span>
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="john@example.com"
                  fullWidth
                  disabled
                  error={errors.email}
                />
                <p className="text-xs text-brand-gray-medium mt-1">
                  Email cannot be changed. Contact us if you need to update it.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="job_title" className="block text-sm font-semibold text-white mb-2">
                    Job Title
                  </label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) => handleChange('job_title', e.target.value)}
                    placeholder="Senior Developer"
                    fullWidth
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-semibold text-white mb-2">
                    Company
                  </label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    placeholder="Acme Inc."
                    fullWidth
                  />
                </div>
              </div>
            </section>

            {/* Profile Photo */}
            <section className="bg-brand-gray-dark rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Profile Photo</h2>
              <p className="text-sm text-brand-gray-light mb-4">
                Upload a professional photo that will be displayed on the conference website if your talk is accepted.
              </p>

              <div className="flex items-start gap-6">
                {/* Image Preview */}
                <div className="flex-shrink-0">
                  {profileImageUrl ? (
                    <img
                      src={profileImageUrl}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-2 border-brand-gray-medium"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-brand-gray-darkest border-2 border-brand-gray-medium flex items-center justify-center">
                      <User className="w-10 h-10 text-brand-gray-medium" />
                    </div>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={handleImageSelect}
                    disabled={isUploadingImage}
                    className="px-4 py-2 bg-brand-gray-darkest text-white rounded-lg hover:bg-brand-gray-medium transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {isUploadingImage ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Image className="w-4 h-4" />
                        {profileImageUrl ? 'Change Photo' : 'Upload Photo'}
                      </>
                    )}
                  </button>

                  <p className="text-xs text-brand-gray-medium mt-2">
                    JPG, PNG, WebP or GIF. Max 5MB.
                  </p>

                  {/* Image Upload Success */}
                  {imageSuccess && (
                    <div className="flex items-center gap-2 text-green-400 text-sm mt-2">
                      <Check className="w-4 h-4" />
                      {imageSuccess}
                    </div>
                  )}

                  {/* Image Upload Error */}
                  {imageError && (
                    <div className="flex items-center gap-2 text-red-400 text-sm mt-2">
                      <AlertCircle className="w-4 h-4" />
                      {imageError}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Bio */}
            <section className="bg-brand-gray-dark rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Biography</h2>

              <div>
                <label htmlFor="bio" className="block text-sm font-semibold text-white mb-2">
                  Bio <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Tell us about yourself, your experience, and what you're passionate about..."
                  rows={5}
                  className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                />
                <div className="flex justify-between mt-2">
                  <p className={`text-xs ${errors.bio ? 'text-red-400' : 'text-brand-gray-medium'}`}>
                    {errors.bio || 'This will be displayed on your speaker profile'}
                  </p>
                  <p className={`text-xs ${countWords(formData.bio || '') > 250 ? 'text-red-400' : 'text-brand-gray-medium'}`}>
                    {countWords(formData.bio || '')}/250 words
                  </p>
                </div>
              </div>
            </section>

            {/* Conference Details */}
            <section className="bg-brand-gray-dark rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Conference Details</h2>

              <div>
                <label htmlFor="tshirt_size" className="block text-sm font-semibold text-white mb-2">
                  T-Shirt Size
                </label>
                <select
                  id="tshirt_size"
                  value={formData.tshirt_size || ''}
                  onChange={(e) => handleChange('tshirt_size', e.target.value as CfpTshirtSize || null)}
                  className="w-full bg-brand-gray-darkest text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                >
                  <option value="">Select size</option>
                  {TSHIRT_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-brand-gray-medium mt-1">
                  All accepted speakers receive a conference t-shirt
                </p>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.company_interested_in_sponsoring === true}
                    onChange={(e) => handleChange('company_interested_in_sponsoring', e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-brand-gray-medium bg-brand-gray-darkest text-brand-primary focus:ring-brand-primary"
                  />
                  <div>
                    <div className="text-white font-medium">My company may be interested in sponsoring</div>
                    <div className="text-sm text-brand-gray-light">
                      Check this if your company might be interested in sponsoring ZurichJS Conf. We&apos;ll reach out with more information about sponsorship opportunities.
                    </div>
                  </div>
                </label>
              </div>
            </section>

            {/* Social Links */}
            <section className="bg-brand-gray-dark rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Social Links</h2>
              <p className="text-sm text-brand-gray-light mb-4">
                Optional: Add your social profiles so attendees can connect with you.
              </p>

              <div>
                <label htmlFor="linkedin_url" className="block text-sm font-semibold text-white mb-2">
                  LinkedIn URL
                </label>
                <Input
                  id="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={(e) => handleChange('linkedin_url', e.target.value)}
                  placeholder="https://linkedin.com/in/johndoe"
                  fullWidth
                  error={errors.linkedin_url}
                />
              </div>

              <div>
                <label htmlFor="github_url" className="block text-sm font-semibold text-white mb-2">
                  GitHub URL
                </label>
                <Input
                  id="github_url"
                  value={formData.github_url}
                  onChange={(e) => handleChange('github_url', e.target.value)}
                  placeholder="https://github.com/johndoe"
                  fullWidth
                  error={errors.github_url}
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="twitter_handle" className="block text-sm font-semibold text-white mb-2">
                    Twitter/X Handle
                  </label>
                  <Input
                    id="twitter_handle"
                    value={formData.twitter_handle}
                    onChange={(e) => handleChange('twitter_handle', e.target.value)}
                    placeholder="@johndoe"
                    fullWidth
                  />
                </div>

                <div>
                  <label htmlFor="bluesky_handle" className="block text-sm font-semibold text-white mb-2">
                    Bluesky Handle
                  </label>
                  <Input
                    id="bluesky_handle"
                    value={formData.bluesky_handle}
                    onChange={(e) => handleChange('bluesky_handle', e.target.value)}
                    placeholder="@johndoe.bsky.social"
                    fullWidth
                  />
                </div>

                <div>
                  <label htmlFor="mastodon_handle" className="block text-sm font-semibold text-white mb-2">
                    Mastodon Handle
                  </label>
                  <Input
                    id="mastodon_handle"
                    value={formData.mastodon_handle}
                    onChange={(e) => handleChange('mastodon_handle', e.target.value)}
                    placeholder="@johndoe@mastodon.social"
                    fullWidth
                  />
                </div>
              </div>
            </section>

            {/* Submit */}
            <div className="flex items-center justify-between pt-4">
              <Link
                href="/cfp/dashboard"
                className="text-brand-gray-light hover:text-white text-sm transition-colors"
              >
                Cancel
              </Link>
              <Button type="submit" variant="primary" size="lg" loading={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </main>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<ProfileProps> = async (ctx) => {
  const supabaseServer = createSupabaseServerClient(ctx);

  // Get session
  const {
    data: { session },
    error: sessionError,
  } = await supabaseServer.auth.getSession();

  if (sessionError || !session) {
    return {
      redirect: {
        destination: '/cfp/login',
        permanent: false,
      },
    };
  }

  // Get speaker profile
  const speaker = await getSpeakerByUserId(session.user.id);

  if (!speaker) {
    return {
      redirect: {
        destination: '/cfp/login',
        permanent: false,
      },
    };
  }

  return {
    props: {
      speaker,
    },
  };
};
