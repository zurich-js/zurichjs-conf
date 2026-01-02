/**
 * CFP Speaker Profile Page
 * Edit speaker profile information
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import {
  ChevronLeft,
  Check,
  AlertCircle,
  User,
  ImageIcon,
  Plane,
  Heart,
  Shirt,
  Github,
  Linkedin,
  ExternalLink,
  Mail
} from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Button, Heading, Input, SearchableSelect, AirportInput } from '@/components/atoms';
import { useToast } from '@/contexts/ToastContext';
import { createSupabaseServerClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { getMissingProfileFields } from '@/lib/cfp/auth-constants';
import { speakerProfileSchema, TSHIRT_SIZES, type SpeakerProfileFormData } from '@/lib/validations/cfp';
import { COUNTRIES, isEuropeanCountry } from '@/lib/constants/countries';
import type { CfpSpeaker, CfpTshirtSize, CfpAssistanceType } from '@/lib/types/cfp';

// Travel assistance options
type TravelOption = 'employer_covers' | 'self_managed' | 'need_assistance';

interface ProfileProps {
  speaker: CfpSpeaker;
}

/**
 * Toggle Switch Component
 */
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-brand-gray-dark ${
        checked ? 'bg-brand-primary' : 'bg-brand-gray-medium'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function CfpProfile({ speaker }: ProfileProps) {
  const router = useRouter();
  const toast = useToast();
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
    city: speaker.city || '',
    country: speaker.country || '',
    bio: speaker.bio || '',
    linkedin_url: speaker.linkedin_url || '',
    github_url: speaker.github_url || '',
    twitter_handle: speaker.twitter_handle || '',
    bluesky_handle: speaker.bluesky_handle || '',
    mastodon_handle: speaker.mastodon_handle || '',
    tshirt_size: speaker.tshirt_size || null,
    travel_assistance_required: speaker.travel_assistance_required || false,
    assistance_type: speaker.assistance_type || null,
    departure_airport: speaker.departure_airport || null,
    special_requirements: speaker.special_requirements || '',
    company_interested_in_sponsoring: speaker.company_interested_in_sponsoring || false,
  });

  // Travel option state derived from form data
  const [travelOption, setTravelOption] = useState<TravelOption | null>(() => {
    if (speaker.travel_assistance_required === false) {
      // Could be employer covers or self-managed - default to self-managed if not set
      return 'self_managed';
    }
    if (speaker.travel_assistance_required === true) {
      return 'need_assistance';
    }
    return null;
  });

  // Check if speaker is from Europe (for travel budget messaging)
  const isEuropean = useMemo(() => {
    return formData.country ? isEuropeanCountry(formData.country) : false;
  }, [formData.country]);

  // Get missing required fields for the banner
  const missingFields = useMemo(() => getMissingProfileFields(speaker), [speaker]);

  // Handle travel option change
  const handleTravelOptionChange = (option: TravelOption) => {
    setTravelOption(option);
    if (option === 'employer_covers' || option === 'self_managed') {
      handleChange('travel_assistance_required', false);
      handleChange('assistance_type', null);
      handleChange('departure_airport', null);
    } else {
      handleChange('travel_assistance_required', true);
    }
  };

  // Scroll to first error when errors change
  useEffect(() => {
    const errorKeys = Object.keys(errors).filter(key => key !== '_form');
    if (errorKeys.length === 0) return;

    const firstErrorField = errorKeys[0];
    const errorElement = document.getElementById(firstErrorField);

    if (errorElement) {
      // Scroll the element into view with some offset
      const yOffset = -100;
      const y = errorElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      // Focus the element after scrolling
      setTimeout(() => {
        errorElement.focus();
      }, 500);
    }
  }, [errors]);

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
      toast.success('Photo Updated', 'Your profile picture has been saved.');

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
      toast.success('Profile Saved', 'Your speaker profile has been updated.');

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
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
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

        <main className="max-w-6xl mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8 max-w-2xl">
            <Heading level="h1" className="text-3xl font-bold text-white mb-3">
              Your speaker profile
            </Heading>
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
                  <h3 className="text-sm font-semibold text-amber-400 mb-1">
                    Profile Incomplete
                  </h3>
                  <p className="text-sm text-amber-200/80 mb-2">
                    Please complete the following required fields to submit proposals:
                  </p>
                  <ul className="text-sm text-amber-200/80 list-disc list-inside">
                    {missingFields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 max-w-2xl">
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-5 h-5" />
                <span className="font-medium">{successMessage}</span>
              </div>
            </div>
          )}

          {errors._form && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 max-w-2xl">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{errors._form}</span>
              </div>
            </div>
          )}

          {/* Two-column layout: Main content + Sidebar */}
          <form onSubmit={handleSubmit}>
            {/* Profile Photo Card - Mobile Only */}
            <div className="lg:hidden mb-8">
              <div className="bg-brand-gray-dark rounded-2xl p-6">
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Profile photo<span className="text-red-400">*</span>
                    </h3>
                    <p className="text-sm text-brand-gray-light">
                      Upload a professional photo for the conference website. Preferably at least 600x600 pixels.
                    </p>
                  </div>

                  {/* Image Preview */}
                  <div className="flex-shrink-0">
                    {profileImageUrl ? (
                      <img
                        key={profileImageUrl}
                        src={profileImageUrl}
                        alt="Profile"
                        className="w-16 h-16 rounded-lg object-cover border border-dashed border-brand-gray-medium"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-brand-gray-darkest border border-dashed border-brand-gray-medium flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-brand-gray-medium" />
                      </div>
                    )}
                  </div>
                </div>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="mobile-image-upload"
                />

                <label
                  htmlFor="mobile-image-upload"
                  className={`w-full px-4 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2 ${
                    isUploadingImage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {isUploadingImage ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : profileImageUrl ? (
                    'Upload new photo'
                  ) : (
                    'Upload photo'
                  )}
                </label>

                {imageSuccess && (
                  <div className="flex items-center gap-2 text-green-400 text-sm mt-3">
                    <Check className="w-4 h-4" />
                    {imageSuccess}
                  </div>
                )}

                {imageError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm mt-3">
                    <AlertCircle className="w-4 h-4" />
                    {imageError}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Main Content Column */}
              <div className="flex-1 space-y-8 min-w-0">
                {/* Personal Information */}
                <section className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-5 h-5 text-brand-primary" />
                      <h2 className="text-lg font-semibold text-white">Personal information</h2>
                    </div>
                    <p className="text-sm text-brand-gray-light">
                      We&apos;ll use this information on all marketing materials, including, but not limited to the website and social media.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="first_name" className="block text-sm font-medium text-white mb-2">
                        First name<span className="text-red-400">*</span>
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
                      <label htmlFor="last_name" className="block text-sm font-medium text-white mb-2">
                        Last name<span className="text-red-400">*</span>
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
                    <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                      E-mail address<span className="text-red-400">*</span>
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="john@example.com"
                      fullWidth
                      disabled
                    />
                  </div>

                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-white mb-2">
                      Bio<span className="text-red-400">*</span>
                    </label>
                    <textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleChange('bio', e.target.value)}
                      placeholder="Tell us about yourself, your experience, and what you're passionate about."
                      rows={4}
                      className="w-full bg-brand-gray-dark text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 border border-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                    />
                    <div className="flex justify-end mt-2">
                      <p className={`text-xs ${countWords(formData.bio || '') > 250 ? 'text-red-400' : 'text-brand-gray-medium'}`}>
                        {countWords(formData.bio || '')}/250 words
                      </p>
                    </div>
                    {errors.bio && (
                      <p className="text-xs text-red-400 mt-1">{errors.bio}</p>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="job_title" className="block text-sm font-medium text-white mb-2">
                        Job title<span className="text-red-400">*</span>
                      </label>
                      <Input
                        id="job_title"
                        value={formData.job_title}
                        onChange={(e) => handleChange('job_title', e.target.value)}
                        placeholder="Senior Developer"
                        fullWidth
                        error={errors.job_title}
                      />
                    </div>

                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-white mb-2">
                        Company<span className="text-red-400">*</span>
                      </label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => handleChange('company', e.target.value)}
                        placeholder="Acme Inc."
                        fullWidth
                        error={errors.company}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-white mb-2">
                        City<span className="text-red-400">*</span>
                      </label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        placeholder="Zurich"
                        fullWidth
                        error={errors.city}
                      />
                    </div>
                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-white mb-2">
                        Country<span className="text-red-400">*</span>
                      </label>
                      <SearchableSelect
                        id="country"
                        value={formData.country}
                        onChange={(value) => handleChange('country', value)}
                        options={COUNTRIES}
                        placeholder="Select country"
                        error={errors.country}
                      />
                    </div>
                  </div>
                </section>

                {/* Travel Section */}
                <section className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Plane className="w-5 h-5 text-brand-primary" />
                      <h2 className="text-lg font-semibold text-white">Travel</h2>
                    </div>
                    <p className="text-sm text-brand-gray-light">
                      As a non-profit community conference, we&apos;ll try our best to support you with travel and accommodation.
                    </p>
                  </div>

                  <ul className="text-sm text-brand-gray-light space-y-1 list-disc list-inside">
                    <li>
                      for <strong className="text-white">European travel</strong> (flight, train, driving, cycling etc): we can help out with up to <strong className="text-brand-primary">250 CHF/EUR</strong>.
                    </li>
                    <li>
                      for <strong className="text-white">outside Europe</strong>, we can only make decisions on a case-by-case basis after the talk selection.
                    </li>
                  </ul>

                  <p className="text-sm text-brand-gray-light">
                    <strong className="text-brand-primary">If your company can cover travel costs</strong>, we&apos;ll be more than happy to include them as a &quot;Supporter&quot; sponsor with all the associated perks.
                  </p>

                  {/* Travel Option Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => handleTravelOptionChange('employer_covers')}
                      className={`cursor-pointer p-4 rounded-xl text-sm font-medium transition-all border text-center ${
                        travelOption === 'employer_covers'
                          ? 'bg-white text-black border-white'
                          : 'bg-transparent text-white border-brand-gray-medium hover:border-brand-gray-light'
                      }`}
                    >
                      My employer covers travel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTravelOptionChange('self_managed')}
                      className={`cursor-pointer p-4 rounded-xl text-sm font-medium transition-all border text-center ${
                        travelOption === 'self_managed'
                          ? 'bg-white text-black border-white'
                          : 'bg-transparent text-white border-brand-gray-medium hover:border-brand-gray-light'
                      }`}
                    >
                      I&apos;ll sort it on my own
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTravelOptionChange('need_assistance')}
                      className={`cursor-pointer p-4 rounded-xl text-sm font-medium transition-all border text-center ${
                        travelOption === 'need_assistance'
                          ? 'bg-white text-black border-white'
                          : 'bg-transparent text-white border-brand-gray-medium hover:border-brand-gray-light'
                      }`}
                    >
                      I need travel assistance
                    </button>
                  </div>

                  {/* Assistance Type Selection - only show when need_assistance is selected */}
                  {travelOption === 'need_assistance' && (
                    <div className="space-y-4 pt-4 border-t border-brand-gray-medium">
                      <div>
                        <label className="block text-sm font-medium text-white mb-3">
                          What do you need help with?
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {[
                            { value: 'travel', label: 'Travel Only' },
                            { value: 'accommodation', label: 'Accommodation Only' },
                            { value: 'both', label: 'Both' },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleChange('assistance_type', option.value as CfpAssistanceType)}
                              className={`cursor-pointer px-3 py-2 rounded-lg text-sm font-medium transition-all border text-center ${
                                formData.assistance_type === option.value
                                  ? 'bg-brand-primary text-black border-brand-primary'
                                  : 'bg-brand-gray-dark text-white border-brand-gray-medium hover:border-brand-primary hover:text-brand-primary'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {formData.assistance_type && (
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                          <Check className="w-4 h-4" />
                          <span>
                            {isEuropean
                              ? formData.assistance_type === 'travel'
                                ? "We'll support your travel with up to 250 CHF/EUR"
                                : formData.assistance_type === 'accommodation'
                                ? "We'll arrange your accommodation"
                                : "We'll support your travel (up to 250 CHF/EUR) and arrange accommodation"
                              : `We'll evaluate your ${formData.assistance_type === 'both' ? 'travel & accommodation' : formData.assistance_type} support after talk selection`}
                          </span>
                        </div>
                      )}

                      {/* Airport Field - only show if travel assistance is needed */}
                      {(formData.assistance_type === 'travel' || formData.assistance_type === 'both') && (
                        <div>
                          <label htmlFor="departure_airport" className="block text-sm font-medium text-white mb-2">
                            Where are you flying from?
                          </label>
                          <AirportInput
                            id="departure_airport"
                            value={formData.departure_airport ?? null}
                            onChange={(value) => handleChange('departure_airport', value)}
                            placeholder="Search by city or airport code..."
                            error={errors.departure_airport}
                          />
                          <p className="text-xs text-brand-gray-medium mt-1">
                            Could be your closest airport or another location if you&apos;re already travelling
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* Support Section */}
                <section className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-5 h-5 text-brand-primary" />
                      <h2 className="text-lg font-semibold text-white">Support</h2>
                    </div>
                    <p className="text-sm text-brand-gray-light">
                      And speaking of supporting communities...
                    </p>
                  </div>

                  <div className="text-sm text-brand-gray-light">
                    <p className="mb-3">
                      If you think your company would be interested in our audience profile and/or investing in community conferences, <strong className="text-brand-primary">we&apos;d love intros</strong>!
                    </p>
                    <ul className="space-y-1.5 list-disc list-inside">
                      <li>Get brand visibility with an engaged developer audience and advocates in Swiss companies</li>
                      <li>Find recruiting opportunities with some the world&apos;s top talent</li>
                      <li>Get the company logo on recordings and event materials</li>
                      <li>Network with the Swiss tech community</li>
                    </ul>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <ToggleSwitch
                      checked={formData.company_interested_in_sponsoring === true}
                      onChange={(checked) => handleChange('company_interested_in_sponsoring', checked)}
                    />
                    <span className="font-medium text-white group-hover:text-brand-primary transition-colors">
                      My company might be interested in sponsoring
                    </span>
                  </label>
                </section>

                {/* Conference Details */}
                <section className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shirt className="w-5 h-5 text-brand-primary" />
                      <h2 className="text-lg font-semibold text-white">Conference details</h2>
                    </div>
                    <p className="text-sm text-brand-gray-light">
                      All accepted speakers receive a limited edition conference T-shirt.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="tshirt_size" className="block text-sm font-medium text-white mb-2">
                      T-Shirt size<span className="text-red-400">*</span>
                    </label>
                    <select
                      id="tshirt_size"
                      value={formData.tshirt_size || ''}
                      onChange={(e) => handleChange('tshirt_size', e.target.value as CfpTshirtSize || null)}
                      className={`w-full bg-brand-gray-dark text-white rounded-lg px-4 py-3 border border-brand-gray-medium focus:outline-none focus:ring-2 transition-all appearance-none ${
                        errors.tshirt_size ? 'ring-2 ring-red-500 focus:ring-red-500' : 'focus:ring-brand-primary focus:border-transparent'
                      }`}
                    >
                      <option value="">Select size...</option>
                      {TSHIRT_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    {errors.tshirt_size && (
                      <p className="text-xs text-red-400 mt-1">{errors.tshirt_size}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="special_requirements" className="block text-sm font-medium text-white mb-2">
                      Special requirements
                    </label>
                    <textarea
                      id="special_requirements"
                      value={formData.special_requirements || ''}
                      onChange={(e) => handleChange('special_requirements', e.target.value)}
                      placeholder="Accessibility needs, dietary restrictions, A/V requirements, or other needs we should know about"
                      rows={4}
                      className="w-full bg-brand-gray-dark text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 border border-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                    />
                    <div className="flex justify-end mt-2">
                      <p className="text-xs text-brand-gray-medium">
                        {countWords(formData.special_requirements || '')}/250 words
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              {/* Sidebar Column */}
              <div className="lg:w-80 flex-shrink-0 space-y-6">
                <div className="lg:sticky lg:top-8 space-y-6">
                  {/* Profile Photo Card - Desktop Only */}
                  <div className="hidden lg:block bg-brand-gray-dark rounded-2xl p-6">
                    <div className="flex gap-4 mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">
                          Profile photo<span className="text-red-400">*</span>
                        </h3>
                        <p className="text-sm text-brand-gray-light">
                          Upload a professional photo for the conference website. Preferably at least 600x600 pixels.
                        </p>
                      </div>

                      {/* Image Preview */}
                      <div className="flex-shrink-0">
                        {profileImageUrl ? (
                          <img
                            key={profileImageUrl}
                            src={profileImageUrl}
                            alt="Profile"
                            className="w-16 h-16 rounded-lg object-cover border border-dashed border-brand-gray-medium"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-brand-gray-darkest border border-dashed border-brand-gray-medium flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-brand-gray-medium" />
                          </div>
                        )}
                      </div>
                    </div>

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
                      className="w-full px-4 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    >
                      {isUploadingImage ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          Uploading...
                        </>
                      ) : profileImageUrl ? (
                        'Upload new photo'
                      ) : (
                        'Upload photo'
                      )}
                    </button>

                    {imageSuccess && (
                      <div className="flex items-center gap-2 text-green-400 text-sm mt-3">
                        <Check className="w-4 h-4" />
                        {imageSuccess}
                      </div>
                    )}

                    {imageError && (
                      <div className="flex items-center gap-2 text-red-400 text-sm mt-3">
                        <AlertCircle className="w-4 h-4" />
                        {imageError}
                      </div>
                    )}
                  </div>

                  {/* Social Links Card */}
                  <div className="bg-brand-gray-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Social links<span className="text-red-400">*</span>
                    </h3>
                    <p className="text-sm text-brand-gray-light mb-4">
                      Add <strong className="text-white">at least one social profile</strong> so attendees can follow or connect with you.
                    </p>

                    <div className="space-y-4">
                      {/* GitHub */}
                      <div>
                        <label htmlFor="github_url" className="block text-sm font-medium text-white mb-2">
                          GitHub
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Github className="w-4 h-4 text-brand-gray-light" />
                          </div>
                          <input
                            id="github_url"
                            value={formData.github_url}
                            onChange={(e) => handleChange('github_url', e.target.value)}
                            placeholder="mygithubhandle"
                            className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg pl-10 pr-10 py-3 border border-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                          />
                          {formData.github_url && (
                            <a
                              href={formData.github_url.startsWith('http') ? formData.github_url : `https://github.com/${formData.github_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-gray-light hover:text-white transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                        {errors.github_url && (
                          <p className="text-xs text-red-400 mt-1">{errors.github_url}</p>
                        )}
                      </div>

                      {/* LinkedIn */}
                      <div>
                        <label htmlFor="linkedin_url" className="block text-sm font-medium text-white mb-2">
                          LinkedIn
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Linkedin className="w-4 h-4 text-brand-gray-light" />
                          </div>
                          <input
                            id="linkedin_url"
                            value={formData.linkedin_url}
                            onChange={(e) => handleChange('linkedin_url', e.target.value)}
                            placeholder="johndoe"
                            className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg pl-10 py-3 border border-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                          />
                        </div>
                        {errors.linkedin_url && (
                          <p className="text-xs text-red-400 mt-1">{errors.linkedin_url}</p>
                        )}
                      </div>

                      {/* X.com / Twitter */}
                      <div>
                        <label htmlFor="twitter_handle" className="block text-sm font-medium text-white mb-2">
                          X.com
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-brand-gray-light" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                          </div>
                          <input
                            id="twitter_handle"
                            value={formData.twitter_handle}
                            onChange={(e) => handleChange('twitter_handle', e.target.value)}
                            placeholder="doe"
                            className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg pl-10 py-3 border border-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                          />
                        </div>
                      </div>

                      {/* Bluesky */}
                      <div>
                        <label htmlFor="bluesky_handle" className="block text-sm font-medium text-white mb-2">
                          Bluesky
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-brand-gray-light" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z" />
                            </svg>
                          </div>
                          <input
                            id="bluesky_handle"
                            value={formData.bluesky_handle}
                            onChange={(e) => handleChange('bluesky_handle', e.target.value)}
                            placeholder="johndoe"
                            className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg pl-10 py-3 border border-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                          />
                        </div>
                      </div>

                      {/* Mastodon */}
                      <div>
                        <label htmlFor="mastodon_handle" className="block text-sm font-medium text-white mb-2">
                          Mastodon
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-brand-gray-light" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.668 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z" />
                            </svg>
                          </div>
                          <input
                            id="mastodon_handle"
                            value={formData.mastodon_handle}
                            onChange={(e) => handleChange('mastodon_handle', e.target.value)}
                            placeholder="johndoe"
                            className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg pl-10 py-3 border border-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Card */}
                  <div className="bg-brand-gray-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>

                    <div className="space-y-3">
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={isSubmitting}
                        className="w-full"
                      >
                        {isSubmitting ? 'Saving...' : 'Save changes'}
                      </Button>

                      <a
                        href="mailto:hello@zurichjs.com?subject=CFP%20Question"
                        className="w-full px-4 py-3 bg-transparent text-white font-medium rounded-lg border border-brand-gray-medium hover:border-brand-gray-light transition-colors flex items-center justify-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        Contact the team
                      </a>
                    </div>
                  </div>
                </div>
              </div>
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
