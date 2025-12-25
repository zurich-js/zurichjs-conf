/**
 * Review Step
 * Final review before submission
 */

import { ChevronLeft, Info } from 'lucide-react';
import { Button, Heading } from '@/components/atoms';
import { FormData, TYPE_INFO, WizardStep } from './types';

interface ReviewStepProps {
  formData: FormData;
  isWorkshop: boolean;
  isSubmitting: boolean;
  setStep: (step: WizardStep) => void;
  onSubmit: (asDraft: boolean) => void;
  onBack: () => void;
}

export function ReviewStep({
  formData,
  isWorkshop,
  isSubmitting,
  setStep,
  onSubmit,
  onBack,
}: ReviewStepProps) {
  return (
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
            className="text-brand-primary text-sm hover:underline cursor-pointer"
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

        {formData.special_requirements && (
          <div className="pt-4 border-t border-brand-gray-medium">
            <h4 className="text-sm font-semibold text-white mb-1">Special Requirements</h4>
            <p className="text-brand-gray-light whitespace-pre-wrap">{formData.special_requirements}</p>
          </div>
        )}
      </div>

      {/* Submission Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
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
          onClick={onBack}
          className="text-brand-gray-light hover:text-white transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex gap-3">
          <Button
            onClick={() => onSubmit(true)}
            variant="outline"
            size="lg"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Save as Draft
          </Button>
          <Button
            onClick={() => onSubmit(false)}
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
  );
}
