/**
 * CFP Submission Wizard
 * Multi-step form for creating talk or workshop submissions
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { SEO } from '@/components/SEO';
import { Button, Heading, Input } from '@/components/atoms';
import { createSupabaseServerClient, getSpeakerByUserId, isSpeakerProfileComplete } from '@/lib/cfp/auth';
import type { CfpSpeaker, CfpSubmissionType, CfpTalkLevel, CfpTag } from '@/lib/types/cfp';
import { getSubmissionCount } from '@/lib/cfp/submissions';
import { getSuggestedTags } from '@/lib/cfp/tags';

interface SubmitPageProps {
  speaker: CfpSpeaker;
  suggestedTags: CfpTag[];
  currentSubmissionCount: number;
}

type WizardStep = 'type' | 'details' | 'logistics' | 'review';

interface FormData {
  submission_type: CfpSubmissionType;
  title: string;
  abstract: string;
  talk_level: CfpTalkLevel;
  tags: string[];
  outline: string;
  additional_notes: string;
  slides_url: string;
  previous_recording_url: string;
  travel_assistance_required: boolean;
  travel_origin: string;
  company_can_cover_travel: boolean;
  special_requirements: string;
  // Workshop-specific
  workshop_duration_hours: number;
  workshop_expected_compensation: string;
  workshop_special_requirements: string;
  workshop_max_participants: number;
}

const INITIAL_FORM_DATA: FormData = {
  submission_type: 'standard',
  title: '',
  abstract: '',
  talk_level: 'intermediate',
  tags: [],
  outline: '',
  additional_notes: '',
  slides_url: '',
  previous_recording_url: '',
  travel_assistance_required: false,
  travel_origin: '',
  company_can_cover_travel: false,
  special_requirements: '',
  workshop_duration_hours: 4,
  workshop_expected_compensation: '',
  workshop_special_requirements: '',
  workshop_max_participants: 30,
};

const TYPE_INFO = {
  lightning: {
    title: 'Lightning Talk',
    duration: '10 minutes',
    description: 'Quick, focused presentations that pack a punch. Great for introducing a concept or sharing a quick tip.',
  },
  standard: {
    title: 'Standard Talk',
    duration: '30 minutes',
    description: 'The classic conference talk format. Dive deep into a topic with time for context, examples, and takeaways.',
  },
  workshop: {
    title: 'Workshop',
    duration: '2-8 hours',
    description: 'Hands-on sessions where attendees learn by doing. Interactive coding exercises and real-world projects.',
  },
};

const LEVEL_INFO = {
  beginner: 'Suitable for developers new to the topic',
  intermediate: 'Assumes some familiarity with the topic',
  advanced: 'For developers with significant experience',
};

export default function SubmitPage({ suggestedTags }: SubmitPageProps) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>('type');
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const isWorkshop = formData.submission_type === 'workshop';

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !formData.tags.includes(trimmed) && formData.tags.length < 5) {
      updateField('tags', [...formData.tags, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    updateField('tags', formData.tags.filter((t) => t !== tag));
  };

  const validateStep = (currentStep: WizardStep): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 'details') {
      if (!formData.title || formData.title.length < 5) {
        newErrors.title = 'Title must be at least 5 characters';
      }
      if (!formData.abstract || formData.abstract.length < 100) {
        newErrors.abstract = 'Abstract must be at least 100 characters';
      }
      if (formData.tags.length === 0) {
        newErrors.tags = 'Select at least one tag';
      }
    }

    if (currentStep === 'logistics' && isWorkshop) {
      if (!formData.workshop_duration_hours || formData.workshop_duration_hours < 2 || formData.workshop_duration_hours > 8) {
        newErrors.workshop_duration_hours = 'Duration must be between 2-8 hours';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;

    const steps: WizardStep[] = ['type', 'details', 'logistics', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: WizardStep[] = ['type', 'details', 'logistics', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async (asDraft: boolean = true) => {
    if (!validateStep('review')) return;

    setIsSubmitting(true);

    try {
      // Build submission data
      const submissionData: Record<string, unknown> = {
        submission_type: formData.submission_type,
        title: formData.title,
        abstract: formData.abstract,
        talk_level: formData.talk_level,
        tags: formData.tags,
        outline: formData.outline || undefined,
        additional_notes: formData.additional_notes || undefined,
        slides_url: formData.slides_url || undefined,
        previous_recording_url: formData.previous_recording_url || undefined,
        travel_assistance_required: formData.travel_assistance_required,
        travel_origin: formData.travel_origin || undefined,
        company_can_cover_travel: formData.company_can_cover_travel,
        special_requirements: formData.special_requirements || undefined,
      };

      // Add workshop fields if applicable
      if (isWorkshop) {
        submissionData.workshop_duration_hours = formData.workshop_duration_hours;
        submissionData.workshop_expected_compensation = formData.workshop_expected_compensation || undefined;
        submissionData.workshop_special_requirements = formData.workshop_special_requirements || undefined;
        submissionData.workshop_max_participants = formData.workshop_max_participants || undefined;
      }

      // Create submission
      const response = await fetch('/api/cfp/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create submission');
      }

      // If not saving as draft, submit for review
      if (!asDraft) {
        const submitResponse = await fetch(`/api/cfp/submissions/${data.submission.id}/submit`, {
          method: 'POST',
        });

        if (!submitResponse.ok) {
          const submitData = await submitResponse.json();
          throw new Error(submitData.error || 'Failed to submit for review');
        }
      }

      router.push('/cfp/dashboard');
    } catch (err) {
      setErrors({
        _form: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepNumber = ['type', 'details', 'logistics', 'review'].indexOf(step) + 1;

  return (
    <>
      <SEO
        title="Submit a Proposal | CFP"
        description="Submit your talk or workshop proposal for ZurichJS Conf 2026"
        noindex
      />

      <div className="min-h-screen bg-brand-gray-darkest">
        {/* Header */}
        <header className="border-b border-brand-gray-dark">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/cfp/dashboard" className="flex items-center gap-3">
              <img src="/images/logo/zurichjs-square.png" alt="ZurichJS" className="h-10 w-10" />
              <span className="text-white font-semibold">New Proposal</span>
            </Link>
            <Link
              href="/cfp/dashboard"
              className="text-brand-gray-light hover:text-white text-sm transition-colors"
            >
              Cancel
            </Link>
          </div>
        </header>

        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            {['Type', 'Details', 'Logistics', 'Review'].map((label, index) => (
              <div key={label} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    index + 1 <= stepNumber
                      ? 'bg-brand-primary text-black'
                      : 'bg-brand-gray-dark text-brand-gray-medium'
                  }`}
                >
                  {index + 1}
                </div>
                <span className={`ml-2 text-sm hidden sm:inline ${
                  index + 1 <= stepNumber ? 'text-white' : 'text-brand-gray-medium'
                }`}>
                  {label}
                </span>
                {index < 3 && (
                  <div className={`w-12 sm:w-24 h-0.5 mx-2 ${
                    index + 1 < stepNumber ? 'bg-brand-primary' : 'bg-brand-gray-dark'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-4 pb-12">
          {/* Form Error */}
          {errors._form && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-red-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{errors._form}</span>
              </div>
            </div>
          )}

          {/* Step 1: Type Selection */}
          {step === 'type' && (
            <div className="space-y-6">
              <div>
                <Heading level="h1" className="text-2xl font-bold text-white mb-2">
                  What type of session?
                </Heading>
                <p className="text-brand-gray-light">
                  Choose the format that best fits your content.
                </p>
              </div>

              <div className="grid gap-4">
                {(['lightning', 'standard', 'workshop'] as CfpSubmissionType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateField('submission_type', type)}
                    className={`p-6 rounded-xl text-left transition-all ${
                      formData.submission_type === type
                        ? 'bg-brand-primary/20 border-2 border-brand-primary'
                        : 'bg-brand-gray-dark border-2 border-transparent hover:border-brand-gray-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {TYPE_INFO[type].title}
                      </h3>
                      <span className="px-3 py-1 bg-brand-gray-darkest rounded-full text-sm text-brand-gray-light">
                        {TYPE_INFO[type].duration}
                      </span>
                    </div>
                    <p className="text-brand-gray-light text-sm">
                      {TYPE_INFO[type].description}
                    </p>
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={nextStep} variant="primary" size="lg">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 'details' && (
            <div className="space-y-6">
              <div>
                <Heading level="h1" className="text-2xl font-bold text-white mb-2">
                  {isWorkshop ? 'Workshop Details' : 'Talk Details'}
                </Heading>
                <p className="text-brand-gray-light">
                  Tell us about your {isWorkshop ? 'workshop' : 'talk'}.
                </p>
              </div>

              <div className="bg-brand-gray-dark rounded-2xl p-6 space-y-6">
                {/* Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-semibold text-white mb-2">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="An engaging title for your session"
                    fullWidth
                    error={errors.title}
                  />
                </div>

                {/* Abstract */}
                <div>
                  <label htmlFor="abstract" className="block text-sm font-semibold text-white mb-2">
                    Abstract <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="abstract"
                    value={formData.abstract}
                    onChange={(e) => updateField('abstract', e.target.value)}
                    placeholder="Describe what attendees will learn and why they should attend..."
                    rows={5}
                    className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                  />
                  <div className="flex justify-between mt-2">
                    <p className={`text-xs ${errors.abstract ? 'text-red-400' : 'text-brand-gray-medium'}`}>
                      {errors.abstract || 'Minimum 100 characters'}
                    </p>
                    <p className="text-xs text-brand-gray-medium">
                      {formData.abstract.length} characters
                    </p>
                  </div>
                </div>

                {/* Level */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Difficulty Level <span className="text-red-400">*</span>
                  </label>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {(['beginner', 'intermediate', 'advanced'] as CfpTalkLevel[]).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => updateField('talk_level', level)}
                        className={`p-3 rounded-lg text-left transition-all ${
                          formData.talk_level === level
                            ? 'bg-brand-primary/20 border border-brand-primary'
                            : 'bg-brand-gray-darkest border border-transparent hover:border-brand-gray-medium'
                        }`}
                      >
                        <div className="font-medium text-white capitalize">{level}</div>
                        <div className="text-xs text-brand-gray-light mt-1">
                          {LEVEL_INFO[level]}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Tags <span className="text-red-400">*</span>
                    <span className="font-normal text-brand-gray-medium ml-2">
                      ({formData.tags.length}/5)
                    </span>
                  </label>

                  {/* Selected Tags */}
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-white"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Tag Input */}
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag(tagInput);
                        }
                      }}
                      placeholder="Type a tag and press Enter"
                      fullWidth
                      disabled={formData.tags.length >= 5}
                    />
                  </div>

                  {/* Suggested Tags */}
                  <div className="flex flex-wrap gap-2">
                    {suggestedTags
                      .filter((t) => !formData.tags.includes(t.name))
                      .slice(0, 15)
                      .map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => addTag(tag.name)}
                          disabled={formData.tags.length >= 5}
                          className="px-3 py-1 bg-brand-gray-darkest text-brand-gray-light rounded-full text-sm hover:bg-brand-gray-medium hover:text-white transition-colors disabled:opacity-50"
                        >
                          + {tag.name}
                        </button>
                      ))}
                  </div>
                  {errors.tags && (
                    <p className="text-red-400 text-sm mt-2">{errors.tags}</p>
                  )}
                </div>

                {/* Outline */}
                <div>
                  <label htmlFor="outline" className="block text-sm font-semibold text-white mb-2">
                    Outline <span className="text-brand-gray-medium">(optional)</span>
                  </label>
                  <textarea
                    id="outline"
                    value={formData.outline}
                    onChange={(e) => updateField('outline', e.target.value)}
                    placeholder="Break down the structure of your session..."
                    rows={4}
                    className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                  />
                </div>

                {/* Additional Notes */}
                <div>
                  <label htmlFor="additional_notes" className="block text-sm font-semibold text-white mb-2">
                    Notes for Reviewers <span className="text-brand-gray-medium">(optional)</span>
                  </label>
                  <textarea
                    id="additional_notes"
                    value={formData.additional_notes}
                    onChange={(e) => updateField('additional_notes', e.target.value)}
                    placeholder="Anything else reviewers should know..."
                    rows={3}
                    className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                  />
                </div>

                {/* Links */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="slides_url" className="block text-sm font-semibold text-white mb-2">
                      Slides URL <span className="text-brand-gray-medium">(optional)</span>
                    </label>
                    <Input
                      id="slides_url"
                      value={formData.slides_url}
                      onChange={(e) => updateField('slides_url', e.target.value)}
                      placeholder="https://..."
                      fullWidth
                    />
                  </div>
                  <div>
                    <label htmlFor="previous_recording_url" className="block text-sm font-semibold text-white mb-2">
                      Previous Recording <span className="text-brand-gray-medium">(optional)</span>
                    </label>
                    <Input
                      id="previous_recording_url"
                      value={formData.previous_recording_url}
                      onChange={(e) => updateField('previous_recording_url', e.target.value)}
                      placeholder="https://youtube.com/..."
                      fullWidth
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="text-brand-gray-light hover:text-white transition-colors inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <Button onClick={nextStep} variant="primary" size="lg">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Logistics */}
          {step === 'logistics' && (
            <div className="space-y-6">
              <div>
                <Heading level="h1" className="text-2xl font-bold text-white mb-2">
                  {isWorkshop ? 'Workshop Logistics' : 'Travel & Logistics'}
                </Heading>
                <p className="text-brand-gray-light">
                  Help us plan for your session.
                </p>
              </div>

              {/* Workshop-specific fields */}
              {isWorkshop && (
                <div className="bg-brand-gray-dark rounded-2xl p-6 space-y-6">
                  <h3 className="text-lg font-semibold text-white">Workshop Details</h3>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="workshop_duration" className="block text-sm font-semibold text-white mb-2">
                        Duration (hours) <span className="text-red-400">*</span>
                      </label>
                      <Input
                        id="workshop_duration"
                        type="number"
                        min={2}
                        max={8}
                        value={formData.workshop_duration_hours}
                        onChange={(e) => updateField('workshop_duration_hours', parseInt(e.target.value) || 4)}
                        fullWidth
                        error={errors.workshop_duration_hours}
                      />
                      <p className="text-xs text-brand-gray-medium mt-1">Between 2-8 hours</p>
                    </div>

                    <div>
                      <label htmlFor="workshop_max_participants" className="block text-sm font-semibold text-white mb-2">
                        Max Participants
                      </label>
                      <Input
                        id="workshop_max_participants"
                        type="number"
                        min={5}
                        max={100}
                        value={formData.workshop_max_participants}
                        onChange={(e) => updateField('workshop_max_participants', parseInt(e.target.value) || 30)}
                        fullWidth
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="workshop_expected_compensation" className="block text-sm font-semibold text-white mb-2">
                      Expected Compensation <span className="text-brand-gray-medium">(optional)</span>
                    </label>
                    <Input
                      id="workshop_expected_compensation"
                      value={formData.workshop_expected_compensation}
                      onChange={(e) => updateField('workshop_expected_compensation', e.target.value)}
                      placeholder="e.g., CHF 500 per hour"
                      fullWidth
                    />
                  </div>

                  <div>
                    <label htmlFor="workshop_special_requirements" className="block text-sm font-semibold text-white mb-2">
                      Special Requirements <span className="text-brand-gray-medium">(optional)</span>
                    </label>
                    <textarea
                      id="workshop_special_requirements"
                      value={formData.workshop_special_requirements}
                      onChange={(e) => updateField('workshop_special_requirements', e.target.value)}
                      placeholder="e.g., Participants need laptops with Node.js installed..."
                      rows={3}
                      className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Travel */}
              <div className="bg-brand-gray-dark rounded-2xl p-6 space-y-6">
                <h3 className="text-lg font-semibold text-white">Travel</h3>

                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.travel_assistance_required}
                      onChange={(e) => updateField('travel_assistance_required', e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-brand-gray-medium bg-brand-gray-darkest text-brand-primary focus:ring-brand-primary"
                    />
                    <div>
                      <div className="text-white font-medium">I need travel assistance</div>
                      <div className="text-sm text-brand-gray-light">
                        We provide flight reimbursement and hotel accommodation for speakers
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.company_can_cover_travel}
                      onChange={(e) => updateField('company_can_cover_travel', e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-brand-gray-medium bg-brand-gray-darkest text-brand-primary focus:ring-brand-primary"
                    />
                    <div>
                      <div className="text-white font-medium">My company can cover travel expenses</div>
                      <div className="text-sm text-brand-gray-light">
                        This helps us allocate our speaker budget fairly
                      </div>
                    </div>
                  </label>
                </div>

                <div>
                  <label htmlFor="travel_origin" className="block text-sm font-semibold text-white mb-2">
                    Where would you be traveling from?
                  </label>
                  <input
                    id="travel_origin"
                    type="text"
                    value={formData.travel_origin}
                    onChange={(e) => updateField('travel_origin', e.target.value)}
                    placeholder="e.g. Berlin, Germany"
                    className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                  />
                  <p className="text-sm text-brand-gray-medium mt-1">
                    This helps us estimate travel costs and plan logistics
                  </p>
                </div>

                <div>
                  <label htmlFor="special_requirements" className="block text-sm font-semibold text-white mb-2">
                    Special Requirements <span className="text-brand-gray-medium">(optional)</span>
                  </label>
                  <textarea
                    id="special_requirements"
                    value={formData.special_requirements}
                    onChange={(e) => updateField('special_requirements', e.target.value)}
                    placeholder="Any accessibility needs, dietary restrictions, or other requirements..."
                    rows={3}
                    className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="text-brand-gray-light hover:text-white transition-colors inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <Button onClick={nextStep} variant="primary" size="lg">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <div>
                <Heading level="h1" className="text-2xl font-bold text-white mb-2">
                  Review Your Submission
                </Heading>
                <p className="text-brand-gray-light">
                  Make sure everything looks good before submitting.
                </p>
              </div>

              {/* Summary Card */}
              <div className="bg-brand-gray-dark rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-sm font-medium">
                      {TYPE_INFO[formData.submission_type].title}
                    </span>
                    <span className="ml-2 px-3 py-1 bg-brand-gray-darkest text-brand-gray-light rounded-full text-sm capitalize">
                      {formData.talk_level}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('type')}
                    className="text-brand-primary text-sm hover:underline"
                  >
                    Edit
                  </button>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{formData.title}</h3>
                  <p className="text-brand-gray-light whitespace-pre-wrap">{formData.abstract}</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-white mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-brand-gray-darkest text-brand-gray-light rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {formData.outline && (
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Outline</h4>
                    <p className="text-brand-gray-light whitespace-pre-wrap">{formData.outline}</p>
                  </div>
                )}

                {isWorkshop && (
                  <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-brand-gray-medium">
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-1">Duration</h4>
                      <p className="text-brand-gray-light">{formData.workshop_duration_hours} hours</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-1">Max Participants</h4>
                      <p className="text-brand-gray-light">{formData.workshop_max_participants}</p>
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-brand-gray-medium">
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-1">Travel Assistance</h4>
                    <p className="text-brand-gray-light">
                      {formData.travel_assistance_required ? 'Requested' : 'Not needed'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-1">Company Covers Travel</h4>
                    <p className="text-brand-gray-light">
                      {formData.company_can_cover_travel ? 'Yes' : 'No'}
                    </p>
                  </div>
                  {formData.travel_origin && (
                    <div className="sm:col-span-2">
                      <h4 className="text-sm font-semibold text-white mb-1">Traveling From</h4>
                      <p className="text-brand-gray-light">{formData.travel_origin}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submission Info */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm">
                    <p className="text-blue-300 font-medium mb-1">About submissions</p>
                    <p className="text-brand-gray-light">
                      You can save as a draft to continue editing later, or submit now for review.
                      Once submitted, you&apos;ll need to withdraw to make changes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="text-brand-gray-light hover:text-white transition-colors inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleSubmit(true)}
                    variant="outline"
                    size="lg"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    onClick={() => handleSubmit(false)}
                    variant="primary"
                    size="lg"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    Submit for Review
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<SubmitPageProps> = async (ctx) => {
  const supabase = createSupabaseServerClient(ctx);

  // Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return {
      redirect: { destination: '/cfp/login', permanent: false },
    };
  }

  // Get speaker
  const speaker = await getSpeakerByUserId(session.user.id);

  if (!speaker) {
    return {
      redirect: { destination: '/cfp/login', permanent: false },
    };
  }

  // Check if profile is complete
  if (!isSpeakerProfileComplete(speaker)) {
    return {
      redirect: { destination: '/cfp/profile', permanent: false },
    };
  }

  // Get submission count
  const currentSubmissionCount = await getSubmissionCount(speaker.id);

  // Check limit
  if (currentSubmissionCount >= 5) {
    return {
      redirect: { destination: '/cfp/dashboard', permanent: false },
    };
  }

  // Get suggested tags
  const suggestedTags = await getSuggestedTags();

  return {
    props: {
      speaker,
      suggestedTags,
      currentSubmissionCount,
    },
  };
};
