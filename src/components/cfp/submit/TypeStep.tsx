/**
 * Type Selection Step
 * Choose between lightning, standard, or workshop
 */

import { Button, Heading } from '@/components/atoms';
import type { CfpSubmissionType } from '@/lib/types/cfp';
import { TYPE_INFO, FormData } from './types';

interface TypeStepProps {
  formData: FormData;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onNext: () => void;
  isEditMode?: boolean;
  onSaveDraft?: () => void;
  isSubmitting?: boolean;
}

export function TypeStep({ formData, updateField, onNext, isEditMode, onSaveDraft, isSubmitting }: TypeStepProps) {
  return (
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
            className={`p-6 rounded-xl text-left transition-all cursor-pointer ${
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

      <div className="flex justify-end pt-4 gap-3">
        {isEditMode && onSaveDraft && (
          <Button
            onClick={onSaveDraft}
            variant="outline"
            size="lg"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Save as Draft
          </Button>
        )}
        <Button onClick={onNext} variant="primary" size="lg">
          Continue
        </Button>
      </div>
    </div>
  );
}
