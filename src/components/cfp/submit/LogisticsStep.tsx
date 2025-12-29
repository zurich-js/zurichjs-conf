/**
 * Logistics Step
 * Workshop-specific details (only shown for workshop submissions)
 */

import { ChevronLeft, Info } from 'lucide-react';
import { Button, Heading, Input } from '@/components/atoms';
import { FormData } from './types';

// Character limit display with color-coding
function CharacterCount({ current, max }: { current: number; max: number }) {
  const percentage = (current / max) * 100;
  const color = percentage >= 100
    ? 'text-red-400'
    : percentage >= 80
    ? 'text-yellow-400'
    : 'text-brand-gray-medium';
  return <span className={`text-xs ${color}`}>{current.toLocaleString()}/{max.toLocaleString()}</span>;
}

interface LogisticsStepProps {
  formData: FormData;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  errors: Record<string, string>;
  isWorkshop: boolean;
  onNext: () => void;
  onBack: () => void;
  isEditMode?: boolean;
  onSaveDraft?: () => void;
  isSubmitting?: boolean;
}

export function LogisticsStep({
  formData,
  updateField,
  errors,
  onNext,
  onBack,
  isEditMode,
  onSaveDraft,
  isSubmitting,
}: LogisticsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <Heading level="h1" className="text-2xl font-bold text-white mb-2">
          Workshop Details
        </Heading>
        <p className="text-brand-gray-light">
          Help us plan for your workshop session.
        </p>
      </div>

      {/* Workshop-specific fields */}
      <div className="bg-brand-gray-dark rounded-2xl p-6 space-y-6">
        <h3 className="text-lg font-semibold text-white">Workshop Configuration</h3>

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

        {/* Compensation Section */}
        <div className="space-y-4">
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-300">A Note on Compensation</h4>
                <p className="text-sm text-blue-200/80 mt-1">
                  We&apos;re committed to keeping ZurichJS Conf accessible and affordable for everyone
                  in the community. At the same time, we value your time and expertise.
                </p>
                <p className="text-sm text-blue-200/80 mt-2">
                  While we can&apos;t always offer compensation, we want to understand if it&apos;s
                  a blocker for you. If compensation is required, let us know below and we&apos;ll
                  do our best to work something out.
                </p>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.workshop_needs_compensation}
                onChange={(e) => updateField('workshop_needs_compensation', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-brand-gray-darkest rounded-full peer-checked:bg-brand-primary transition-colors" />
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform" />
            </div>
            <span className="font-medium text-white group-hover:text-brand-primary transition-colors">
              Compensation is required for me to run this workshop
            </span>
          </label>

          {formData.workshop_needs_compensation && (
            <div className="p-4 bg-brand-gray-darkest rounded-lg border border-brand-gray-medium">
              <label htmlFor="workshop_expected_compensation" className="block text-sm font-semibold text-white mb-2">
                What compensation would you need?
              </label>
              <Input
                id="workshop_expected_compensation"
                value={formData.workshop_expected_compensation}
                onChange={(e) => updateField('workshop_expected_compensation', e.target.value)}
                placeholder="e.g., 400 CHF total, or 50 EUR/hour"
                fullWidth
              />
              <p className="text-xs text-brand-gray-medium mt-2">
                Please state your desired currency (ideally CHF or EUR, but we&apos;ll do our best with others). We&apos;ll discuss this with you if your workshop is selected.
              </p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="workshop_special_requirements" className="block text-sm font-semibold text-white mb-2">
            Participant Requirements <span className="text-brand-gray-medium">(optional)</span>
          </label>
          <textarea
            id="workshop_special_requirements"
            value={formData.workshop_special_requirements}
            onChange={(e) => updateField('workshop_special_requirements', e.target.value)}
            placeholder="e.g., Participants need laptops with Node.js installed..."
            rows={3}
            maxLength={2000}
            className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
          />
          <div className="flex justify-between mt-1">
            <p className="text-xs text-brand-gray-medium">
              What participants should bring or install before the workshop
            </p>
            <CharacterCount current={formData.workshop_special_requirements.length} max={2000} />
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="text-brand-gray-light hover:text-white transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex gap-3">
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
    </div>
  );
}
