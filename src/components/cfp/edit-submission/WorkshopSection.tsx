/**
 * Workshop Details Section
 * Additional fields for workshop submissions
 */

import { Input } from '@/components/atoms';
import type { FormData } from './types';

interface WorkshopSectionProps {
  formData: FormData;
  errors: Record<string, string>;
  onUpdate: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
}

export function WorkshopSection({ formData, errors, onUpdate }: WorkshopSectionProps) {
  return (
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
            onChange={(e) => onUpdate('workshop_duration_hours', parseInt(e.target.value) || 4)}
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
            onChange={(e) => onUpdate('workshop_max_participants', parseInt(e.target.value) || 30)}
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
          onChange={(e) => onUpdate('workshop_expected_compensation', e.target.value)}
          placeholder="e.g., CHF 50 per hour"
          fullWidth
        />
        <div className="mt-2 p-3 bg-brand-gray-darkest rounded-lg">
          <p className="text-sm text-brand-gray-light">
            <span className="text-brand-primary font-medium">Note:</span> ZurichJS Conf is a community-driven conference
            focused on keeping tickets accessible for everyone. Workshop compensation is negotiable, but please keep our
            community mission in mind. Some compensation amounts may not be financially feasible for us.
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
          onChange={(e) => onUpdate('workshop_special_requirements', e.target.value)}
          placeholder="e.g., Participants need laptops with Node.js installed..."
          rows={3}
          className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
        />
      </div>
    </section>
  );
}
