/**
 * CFP Submission Edit Page
 * Edit a draft submission
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { SEO } from '@/components/SEO';
import { Button, Heading, Input } from '@/components/atoms';
import { createSupabaseServerClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { getSubmissionWithDetails } from '@/lib/cfp/submissions';
import { getSuggestedTags } from '@/lib/cfp/tags';
import type { CfpSpeaker, CfpSubmissionWithDetails, CfpSubmissionType, CfpTalkLevel, CfpTag } from '@/lib/types/cfp';

interface EditSubmissionProps {
  speaker: CfpSpeaker;
  submission: CfpSubmissionWithDetails;
  suggestedTags: CfpTag[];
}

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
  // Workshop-specific
  workshop_duration_hours: number;
  workshop_expected_compensation: string;
  workshop_special_requirements: string;
  workshop_max_participants: number;
}

const TYPE_INFO = {
  lightning: {
    title: 'Lightning Talk',
    duration: '15 minutes',
    description: 'Quick, focused presentations that pack a punch.',
  },
  standard: {
    title: 'Standard Talk',
    duration: '30 minutes',
    description: 'The classic conference talk format.',
  },
  workshop: {
    title: 'Workshop',
    duration: '2-8 hours',
    description: 'Hands-on sessions where attendees learn by doing.',
  },
};

const LEVEL_INFO = {
  beginner: 'Suitable for developers new to the topic',
  intermediate: 'Assumes some familiarity with the topic',
  advanced: 'For developers with significant experience',
};

export default function EditSubmission({ speaker, submission, suggestedTags }: EditSubmissionProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    submission_type: submission.submission_type,
    title: submission.title,
    abstract: submission.abstract,
    talk_level: submission.talk_level,
    tags: submission.tags?.map((t) => t.name) || [],
    outline: submission.outline || '',
    additional_notes: submission.additional_notes || '',
    slides_url: submission.slides_url || '',
    previous_recording_url: submission.previous_recording_url || '',
    workshop_duration_hours: submission.workshop_duration_hours || 4,
    workshop_expected_compensation: submission.workshop_expected_compensation || '',
    workshop_special_requirements: submission.workshop_special_requirements || '',
    workshop_max_participants: submission.workshop_max_participants || 30,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title || formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }
    if (!formData.abstract || formData.abstract.length < 100) {
      newErrors.abstract = 'Abstract must be at least 100 characters';
    }
    if (formData.tags.length === 0) {
      newErrors.tags = 'Select at least one tag';
    }
    if (isWorkshop) {
      if (!formData.workshop_duration_hours || formData.workshop_duration_hours < 2 || formData.workshop_duration_hours > 8) {
        newErrors.workshop_duration_hours = 'Duration must be between 2-8 hours';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);

    try {
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
      };

      if (isWorkshop) {
        submissionData.workshop_duration_hours = formData.workshop_duration_hours;
        submissionData.workshop_expected_compensation = formData.workshop_expected_compensation || undefined;
        submissionData.workshop_special_requirements = formData.workshop_special_requirements || undefined;
        submissionData.workshop_max_participants = formData.workshop_max_participants || undefined;
      }

      const response = await fetch(`/api/cfp/submissions/${submission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      router.push(`/cfp/submissions/${submission.id}`);
    } catch (err) {
      setErrors({
        _form: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <SEO
        title={`Edit: ${submission.title} | CFP`}
        description="Edit your CFP submission"
        noindex
      />

      <div className="min-h-screen bg-brand-gray-darkest">
        {/* Header */}
        <header className="border-b border-brand-gray-dark">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/cfp/dashboard" className="flex items-center gap-3">
              <img src="/images/logo/zurichjs-square.png" alt="ZurichJS" className="h-10 w-10" />
              <span className="text-white font-semibold">Edit Proposal</span>
            </Link>
            <Link
              href={`/cfp/submissions/${submission.id}`}
              className="text-brand-gray-light hover:text-white text-sm transition-colors"
            >
              Cancel
            </Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
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

          {/* Type Selection */}
          <section className="mb-8">
            <Heading level="h2" className="text-lg font-bold text-white mb-4">
              Session Type
            </Heading>
            <div className="grid sm:grid-cols-3 gap-4">
              {(['lightning', 'standard', 'workshop'] as CfpSubmissionType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateField('submission_type', type)}
                  className={`p-4 rounded-xl text-left transition-all cursor-pointer ${
                    formData.submission_type === type
                      ? 'bg-brand-primary/20 border-2 border-brand-primary'
                      : 'bg-brand-gray-dark border-2 border-transparent hover:border-brand-gray-medium'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-white">{TYPE_INFO[type].title}</h3>
                  </div>
                  <p className="text-brand-gray-light text-sm">{TYPE_INFO[type].duration}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Details */}
          <section className="bg-brand-gray-dark rounded-2xl p-6 mb-6 space-y-6">
            <h2 className="text-lg font-bold text-white">Details</h2>

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
                <p className="text-xs text-brand-gray-medium">{formData.abstract.length} characters</p>
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
                    className={`p-3 rounded-lg text-left transition-all cursor-pointer ${
                      formData.talk_level === level
                        ? 'bg-brand-primary/20 border border-brand-primary'
                        : 'bg-brand-gray-darkest border border-transparent hover:border-brand-gray-medium'
                    }`}
                  >
                    <div className="font-medium text-white capitalize">{level}</div>
                    <div className="text-xs text-brand-gray-light mt-1">{LEVEL_INFO[level]}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Tags <span className="text-red-400">*</span>
                <span className="font-normal text-brand-gray-medium ml-2">({formData.tags.length}/5)</span>
              </label>

              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-sm"
                    >
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-white cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}

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
                      className="px-3 py-1 bg-brand-gray-darkest text-brand-gray-light rounded-full text-sm hover:bg-brand-gray-medium hover:text-white transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      + {tag.name}
                    </button>
                  ))}
              </div>
              {errors.tags && <p className="text-red-400 text-sm mt-2">{errors.tags}</p>}
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
          </section>

          {/* Workshop Details */}
          {isWorkshop && (
            <section className="bg-brand-gray-dark rounded-2xl p-6 mb-6 space-y-6">
              <h2 className="text-lg font-bold text-white">Workshop Details</h2>

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
                  placeholder="e.g., CHF 50 per hour"
                  fullWidth
                />
                <div className="mt-2 p-3 bg-brand-gray-darkest rounded-lg">
                  <p className="text-sm text-brand-gray-light">
                    <span className="text-brand-primary font-medium">Note:</span> ZurichJS Conf is a community-driven conference focused on keeping tickets accessible for everyone.
                    Workshop compensation is negotiable, but please keep our community mission in mind.
                    Some compensation amounts may not be financially feasible for us.
                  </p>
                  <p className="text-xs text-brand-gray-medium mt-2">
                    Suggested range: CHF 50-100 per hour depending on workshop complexity and preparation required.
                  </p>
                </div>
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
            </section>
          )}

          {/* Travel */}
          <section className="bg-brand-gray-dark rounded-2xl p-6 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Travel</h2>
              <Link
                href="/cfp/profile"
                className="text-sm text-brand-primary hover:text-brand-primary/80 transition-colors"
              >
                Edit in Profile →
              </Link>
            </div>

            <div className="bg-brand-gray-darkest rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-brand-gray-medium text-sm">Travel Assistance</span>
                <span className="text-white font-medium">
                  {speaker.travel_assistance_required ? (
                    speaker.assistance_type === 'both' ? 'Travel & Accommodation needed' :
                    speaker.assistance_type === 'travel' ? 'Travel needed' :
                    speaker.assistance_type === 'accommodation' ? 'Accommodation needed' :
                    'Requested'
                  ) : 'Not needed'}
                </span>
              </div>
              {speaker.departure_airport && (
                <div className="flex items-center justify-between">
                  <span className="text-brand-gray-medium text-sm">Departure Airport</span>
                  <span className="text-white">{speaker.departure_airport}</span>
                </div>
              )}
              {speaker.special_requirements && (
                <div>
                  <span className="text-brand-gray-medium text-sm block mb-1">Special Requirements</span>
                  <p className="text-white text-sm whitespace-pre-wrap">{speaker.special_requirements}</p>
                </div>
              )}
            </div>

            <p className="text-xs text-brand-gray-medium">
              Travel preferences are managed in your speaker profile and apply to all your submissions.
            </p>
          </section>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <Link
              href={`/cfp/submissions/${submission.id}`}
              className="text-brand-gray-light hover:text-white transition-colors"
            >
              Cancel
            </Link>
            <Button onClick={handleSave} variant="primary" size="lg" loading={isSaving} disabled={isSaving}>
              Save Changes
            </Button>
          </div>
        </main>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<EditSubmissionProps> = async (ctx) => {
  const { id } = ctx.params || {};

  if (!id || typeof id !== 'string') {
    return { notFound: true };
  }

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

  // Get submission with details
  const submission = await getSubmissionWithDetails(id);

  if (!submission) {
    return { notFound: true };
  }

  // Verify ownership
  if (submission.speaker_id !== speaker.id) {
    return { notFound: true };
  }

  // Only allow editing drafts
  if (submission.status !== 'draft') {
    return {
      redirect: { destination: `/cfp/submissions/${id}`, permanent: false },
    };
  }

  // Get suggested tags
  const suggestedTags = await getSuggestedTags();

  return {
    props: {
      speaker,
      submission,
      suggestedTags,
    },
  };
};
