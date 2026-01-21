/**
 * Support Section - Sponsoring toggle
 */

import { Heart } from 'lucide-react';
import { ToggleSwitch } from './ToggleSwitch';
import type { ProfileFormProps } from './types';

export function SupportSection({ formData, handleChange }: ProfileFormProps) {
  return (
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
  );
}
