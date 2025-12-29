/**
 * CFP Speaker Profile Page
 * Edit speaker profile information
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { ChevronLeft, Check, AlertCircle, User, Image, MapPin, Building2, Briefcase, Heart, Plane, Share2, Linkedin, Github, Twitter, AtSign } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Button, Heading, Input, SearchableSelect, AirportInput } from '@/components/atoms';
import { useToast } from '@/contexts/ToastContext';
import { createSupabaseServerClient, getSpeakerByUserId, getMissingProfileFields } from '@/lib/cfp/auth';
import { speakerProfileSchema, TSHIRT_SIZES, type SpeakerProfileFormData } from '@/lib/validations/cfp';
import { COUNTRIES, isEuropeanCountry } from '@/lib/constants/countries';
import type { CfpSpeaker, CfpTshirtSize, CfpAssistanceType } from '@/lib/types/cfp';

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

  // Check if speaker is from Europe (for travel budget messaging)
  const isEuropean = useMemo(() => {
    return formData.country ? isEuropeanCountry(formData.country) : false;
  }, [formData.country]);

  // Get missing required fields for the banner
  const missingFields = useMemo(() => getMissingProfileFields(speaker), [speaker]);

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

  // Calculate completion progress
  const requiredFields = ['first_name', 'last_name', 'job_title', 'company', 'city', 'country', 'bio'];
  const completedFields = requiredFields.filter(f => formData[f as keyof SpeakerProfileFormData]);
  const completionPercent = Math.round((completedFields.length / requiredFields.length) * 100);

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
          {/* Page Header with Progress */}
          <div className="mb-8">
            <Heading level="h1" className="text-2xl font-bold text-white mb-2">
              Speaker Profile
            </Heading>
            <p className="text-brand-gray-light mb-4">
              This information will be displayed on the conference website if your talk is accepted.
            </p>

            {/* Progress Bar */}
            <div className="bg-brand-gray-dark rounded-full h-2 overflow-hidden">
              <div
                className="bg-brand-primary h-full transition-all duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <p className="text-xs text-brand-gray-medium mt-2">
              Profile {completionPercent}% complete
            </p>
          </div>

          {/* Incomplete Profile Banner */}
          {missingFields.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
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

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Profile Photo - Prominent placement */}
            <section className="bg-brand-gray-dark rounded-2xl p-6">
              <div className="flex items-center gap-6">
                {/* Image Preview */}
                <div className="flex-shrink-0">
                  {profileImageUrl ? (
                    <img
                      key={profileImageUrl}
                      src={profileImageUrl}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-2 border-brand-primary"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-brand-gray-darkest border-2 border-dashed border-brand-gray-medium flex items-center justify-center">
                      <User className="w-10 h-10 text-brand-gray-medium" />
                    </div>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-white mb-1">Profile Photo</h2>
                  <p className="text-sm text-brand-gray-light mb-3">
                    A professional photo for the conference website
                  </p>

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
                    className="px-4 py-2 bg-brand-gray-darkest text-white rounded-lg hover:bg-brand-gray-medium transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed inline-flex items-center gap-2 text-sm"
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

                  {imageSuccess && (
                    <div className="flex items-center gap-2 text-green-400 text-sm mt-2">
                      <Check className="w-4 h-4" />
                      {imageSuccess}
                    </div>
                  )}

                  {imageError && (
                    <div className="flex items-center gap-2 text-red-400 text-sm mt-2">
                      <AlertCircle className="w-4 h-4" />
                      {imageError}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Personal Information */}
            <section className="bg-brand-gray-dark rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-brand-primary" />
                <h2 className="text-lg font-semibold text-white">Personal Information</h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-white mb-2">
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
                  <label htmlFor="last_name" className="block text-sm font-medium text-white mb-2">
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
                <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                  Email
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
                <p className="text-xs text-brand-gray-medium mt-1">
                  Email cannot be changed. Contact us if you need to update it.
                </p>
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-white mb-2">
                  Bio <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Tell us about yourself, your experience, and what you're passionate about..."
                  rows={4}
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

            {/* Professional Information */}
            <section className="bg-brand-gray-dark rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-5 h-5 text-brand-primary" />
                <h2 className="text-lg font-semibold text-white">Professional Information</h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="job_title" className="block text-sm font-medium text-white mb-2">
                    Job Title <span className="text-red-400">*</span>
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
                    Company <span className="text-red-400">*</span>
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

              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-brand-primary" />
                  <span className="text-sm font-medium text-white">Location</span>
                  <span className="text-xs text-brand-gray-medium">(helps us plan travel logistics)</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-white mb-2">
                      City <span className="text-red-400">*</span>
                    </label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="Berlin"
                      fullWidth
                      error={errors.city}
                    />
                  </div>
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-white mb-2">
                      Country <span className="text-red-400">*</span>
                    </label>
                    <SearchableSelect
                      id="country"
                      value={formData.country}
                      onChange={(value) => handleChange('country', value)}
                      options={COUNTRIES}
                      placeholder="Select country..."
                      error={errors.country}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Travel & Sponsorship */}
            <section className="bg-brand-gray-dark rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Plane className="w-5 h-5 text-brand-primary" />
                <h2 className="text-lg font-semibold text-white">Travel & Support</h2>
              </div>

              {/* Travel Assistance Card */}
              <div className="bg-brand-gray-darkest rounded-xl p-5 border border-brand-gray-medium space-y-4">
                <div className="flex items-center gap-2">
                  <Plane className="w-5 h-5 text-brand-primary" />
                  <h3 className="font-semibold text-white">Travel & Accommodation Assistance</h3>
                </div>

                <div className="bg-brand-gray-dark rounded-lg p-3 text-sm space-y-2">
                  <p className="text-brand-gray-light">
                    <span className="text-brand-primary font-medium">Community Note:</span> We&apos;ll try our best to support you with this.
                  </p>
                  <ul className="text-brand-gray-light text-xs space-y-1 ml-4 list-disc">
                    <li><strong>European travel</strong> (flight, train, driving): Our budget is <span className="text-brand-primary font-medium">250 CHF/EUR</span></li>
                    <li><strong>Outside Europe</strong>: Evaluated on a case-by-case basis after talk selection</li>
                  </ul>
                  <p className="text-brand-gray-light text-xs mt-2">
                    If your company can cover travel costs, they&apos;ll receive recognition as a <span className="text-brand-primary font-medium">&quot;Supporter&quot;</span> sponsor with logo placement on our website and event materials.
                  </p>
                </div>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <ToggleSwitch
                    checked={formData.travel_assistance_required === true}
                    onChange={(checked) => handleChange('travel_assistance_required', checked)}
                  />
                  <span className="font-medium text-white group-hover:text-brand-primary transition-colors">
                    I need travel assistance
                  </span>
                </label>

                {formData.travel_assistance_required && (
                  <div className="mt-4 pt-4 border-t border-brand-gray-medium space-y-4">
                    {/* Assistance Type Selection */}
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
              </div>

              {/* Company Sponsorship Interest Card */}
              <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-xl p-5 border border-pink-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="w-5 h-5 text-pink-400" />
                  <h3 className="font-semibold text-white">Partner with ZurichJS</h3>
                </div>
                <p className="text-sm text-brand-gray-light mb-3">
                  Connect your company with 300+ JavaScript developers and tech leaders at Switzerland&apos;s premier JS conference.
                </p>
                <ul className="text-sm text-brand-gray-light space-y-1.5 mb-4">
                  <li className="flex items-center gap-2">
                    <span className="text-pink-400">•</span>
                    Brand visibility to an engaged developer audience
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-pink-400">•</span>
                    Recruiting opportunities with top talent
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-pink-400">•</span>
                    Logo placement on recordings and event materials
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-pink-400">•</span>
                    Networking with the Swiss tech community
                  </li>
                </ul>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <ToggleSwitch
                    checked={formData.company_interested_in_sponsoring === true}
                    onChange={(checked) => handleChange('company_interested_in_sponsoring', checked)}
                  />
                  <span className="font-medium text-white group-hover:text-pink-400 transition-colors">
                    My company is interested in sponsoring
                  </span>
                </label>

                {formData.company_interested_in_sponsoring && (
                  <div className="mt-4 pt-4 border-t border-pink-500/20">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <Check className="w-4 h-4" />
                      <span>We&apos;ll reach out with sponsorship packages after your submission</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Conference Details */}
            <section className="bg-brand-gray-dark rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-brand-primary" />
                <h2 className="text-lg font-semibold text-white">Conference Details</h2>
              </div>

              <div>
                <label htmlFor="tshirt_size" className="block text-sm font-medium text-white mb-2">
                  T-Shirt Size <span className="text-red-400">*</span>
                </label>
                <select
                  id="tshirt_size"
                  value={formData.tshirt_size || ''}
                  onChange={(e) => handleChange('tshirt_size', e.target.value as CfpTshirtSize || null)}
                  className={`w-full bg-brand-gray-darkest text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 transition-all ${
                    errors.tshirt_size ? 'ring-2 ring-red-500 focus:ring-red-500' : 'focus:ring-brand-primary'
                  }`}
                >
                  <option value="">Select size</option>
                  {TSHIRT_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                {errors.tshirt_size ? (
                  <p className="text-xs text-red-400 mt-1">{errors.tshirt_size}</p>
                ) : (
                  <p className="text-xs text-brand-gray-medium mt-1">
                    All accepted speakers receive a conference t-shirt
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="special_requirements" className="block text-sm font-medium text-white mb-2">
                  Special Requirements <span className="text-brand-gray-medium">(optional)</span>
                </label>
                <textarea
                  id="special_requirements"
                  value={formData.special_requirements || ''}
                  onChange={(e) => handleChange('special_requirements', e.target.value)}
                  placeholder="Any accessibility needs, dietary restrictions, A/V requirements, or other needs we should know about..."
                  rows={3}
                  className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                />
                <p className="text-xs text-brand-gray-medium mt-1">
                  Help us make your experience comfortable and accessible
                </p>
              </div>
            </section>

            {/* Social Links */}
            <section className="bg-brand-gray-dark rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Share2 className="w-5 h-5 text-brand-primary" />
                <h2 className="text-lg font-semibold text-white">Social Links</h2>
              </div>
              <p className="text-sm text-brand-gray-light -mt-3">
                Optional: Add your social profiles so attendees can connect with you.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="linkedin_url" className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                    <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                    LinkedIn
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
                  <label htmlFor="github_url" className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                    <Github className="w-4 h-4" />
                    GitHub
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
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="twitter_handle" className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                    <Twitter className="w-4 h-4" />
                    Twitter/X
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
                  <label htmlFor="bluesky_handle" className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                    <AtSign className="w-4 h-4 text-[#0085FF]" />
                    Bluesky
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
                  <label htmlFor="mastodon_handle" className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                    <AtSign className="w-4 h-4 text-[#6364FF]" />
                    Mastodon
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
            <div className="flex items-center justify-between pt-4 pb-8">
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
