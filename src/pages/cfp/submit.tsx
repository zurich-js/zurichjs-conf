/**
 * CFP Submission Wizard
 * Multi-step form for creating talk or workshop submissions
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { AlertCircle } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { useToast } from '@/contexts/ToastContext';
import { createSupabaseServerClient, getSpeakerByUserId, isSpeakerProfileComplete } from '@/lib/cfp/auth';
import type { CfpSpeaker, CfpTag } from '@/lib/types/cfp';
import { getSubmissionCount } from '@/lib/cfp/submissions';
import { getSuggestedTags } from '@/lib/cfp/tags';
import {
  WizardStep,
  FormData,
  INITIAL_FORM_DATA,
  TypeStep,
  DetailsStep,
  LogisticsStep,
  ReviewStep,
} from '@/components/cfp/submit';

interface SubmitPageProps {
  speaker: CfpSpeaker;
  suggestedTags: CfpTag[];
  currentSubmissionCount: number;
}

export default function SubmitPage({ suggestedTags }: SubmitPageProps) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<WizardStep>('type');
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

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

  // Get the steps based on submission type (workshops include logistics, talks don't)
  const getSteps = (): WizardStep[] => {
    if (isWorkshop) {
      return ['type', 'details', 'logistics', 'review'];
    }
    return ['type', 'details', 'review'];
  };

  const nextStep = () => {
    if (!validateStep(step)) return;

    const steps = getSteps();
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      const nextStepValue = steps[currentIndex + 1];
      setStep(nextStepValue);
      // Reset edit mode when reaching review step
      if (nextStepValue === 'review') {
        setIsEditMode(false);
      }
    }
  };

  const prevStep = () => {
    const steps = getSteps();
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  // Navigate to a step in edit mode (called from ReviewStep)
  const goToStepForEdit = (targetStep: WizardStep) => {
    setIsEditMode(true);
    setStep(targetStep);
  };

  const handleSubmit = async (asDraft: boolean = true) => {
    if (!validateStep('review')) return;

    setIsSubmitting(true);

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
        special_requirements: formData.special_requirements || undefined,
      };

      if (isWorkshop) {
        submissionData.workshop_duration_hours = formData.workshop_duration_hours;
        submissionData.workshop_expected_compensation = formData.workshop_expected_compensation || undefined;
        submissionData.workshop_special_requirements = formData.workshop_special_requirements || undefined;
        submissionData.workshop_max_participants = formData.workshop_max_participants || undefined;
      }

      const response = await fetch('/api/cfp/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create submission');
      }

      if (!asDraft) {
        const submitResponse = await fetch(`/api/cfp/submissions/${data.submission.id}/submit`, {
          method: 'POST',
        });

        if (!submitResponse.ok) {
          const submitData = await submitResponse.json();
          throw new Error(submitData.error || 'Failed to submit for review');
        }

        toast.success(
          'Proposal Submitted!',
          'Your proposal has been submitted for review. You can track its status on your dashboard.'
        );
      } else {
        toast.success('Draft Saved', 'Your proposal has been saved as a draft.');
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

  const steps = getSteps();
  const stepLabels = isWorkshop ? ['Type', 'Details', 'Logistics', 'Review'] : ['Type', 'Details', 'Review'];
  const stepNumber = steps.indexOf(step) + 1;

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
            {stepLabels.map((label, index) => (
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
                {index < stepLabels.length - 1 && (
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
                <AlertCircle className="w-5 h-5" />
                <span>{errors._form}</span>
              </div>
            </div>
          )}

          {step === 'type' && (
            <TypeStep
              formData={formData}
              updateField={updateField}
              onNext={nextStep}
              isEditMode={isEditMode}
              onSaveDraft={() => handleSubmit(true)}
              isSubmitting={isSubmitting}
            />
          )}

          {step === 'details' && (
            <DetailsStep
              formData={formData}
              updateField={updateField}
              errors={errors}
              isWorkshop={isWorkshop}
              tagInput={tagInput}
              setTagInput={setTagInput}
              suggestedTags={suggestedTags}
              addTag={addTag}
              removeTag={removeTag}
              onNext={nextStep}
              onBack={prevStep}
              isEditMode={isEditMode}
              onSaveDraft={() => handleSubmit(true)}
              isSubmitting={isSubmitting}
            />
          )}

          {step === 'logistics' && isWorkshop && (
            <LogisticsStep
              formData={formData}
              updateField={updateField}
              errors={errors}
              isWorkshop={isWorkshop}
              onNext={nextStep}
              onBack={prevStep}
              isEditMode={isEditMode}
              onSaveDraft={() => handleSubmit(true)}
              isSubmitting={isSubmitting}
            />
          )}

          {step === 'review' && (
            <ReviewStep
              formData={formData}
              isWorkshop={isWorkshop}
              isSubmitting={isSubmitting}
              setStep={goToStepForEdit}
              onSubmit={handleSubmit}
              onBack={prevStep}
            />
          )}
        </main>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<SubmitPageProps> = async (ctx) => {
  const supabase = createSupabaseServerClient(ctx);

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return {
      redirect: { destination: '/cfp/login', permanent: false },
    };
  }

  const speaker = await getSpeakerByUserId(session.user.id);

  if (!speaker) {
    return {
      redirect: { destination: '/cfp/login', permanent: false },
    };
  }

  if (!isSpeakerProfileComplete(speaker)) {
    return {
      redirect: { destination: '/cfp/profile', permanent: false },
    };
  }

  const currentSubmissionCount = await getSubmissionCount(speaker.id);

  if (currentSubmissionCount >= 5) {
    return {
      redirect: { destination: '/cfp/dashboard', permanent: false },
    };
  }

  const suggestedTags = await getSuggestedTags();

  return {
    props: {
      speaker,
      suggestedTags,
      currentSubmissionCount,
    },
  };
};
