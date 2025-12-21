/**
 * Logistics Step
 * Workshop details and travel information
 */

import { ChevronLeft } from 'lucide-react';
import { Button, Heading, Input } from '@/components/atoms';
import { FormData } from './types';

interface LogisticsStepProps {
  formData: FormData;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  errors: Record<string, string>;
  isWorkshop: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function LogisticsStep({
  formData,
  updateField,
  errors,
  isWorkshop,
  onNext,
  onBack,
}: LogisticsStepProps) {
  return (
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
          onClick={onBack}
          className="text-brand-gray-light hover:text-white transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <Button onClick={onNext} variant="primary" size="lg">
          Continue
        </Button>
      </div>
    </div>
  );
}
