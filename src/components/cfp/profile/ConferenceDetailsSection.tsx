/**
 * Conference Details Section - T-shirt and special requirements
 */

import { Shirt } from 'lucide-react';
import { TSHIRT_SIZES } from '@/lib/validations/cfp';
import type { CfpTshirtSize } from '@/lib/types/cfp';
import type { ProfileFormProps } from './types';

export function ConferenceDetailsSection({ formData, errors, handleChange }: ProfileFormProps) {
  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Shirt className="w-5 h-5 text-brand-primary" />
          <h2 className="text-lg font-semibold text-white">Conference details</h2>
        </div>
        <p className="text-sm text-brand-gray-light">
          All accepted speakers receive a limited edition conference T-shirt.
        </p>
      </div>

      <div>
        <label htmlFor="tshirt_size" className="block text-sm font-medium text-white mb-2">
          T-Shirt size<span className="text-red-400">*</span>
        </label>
        <select
          id="tshirt_size"
          value={formData.tshirt_size || ''}
          onChange={(e) => handleChange('tshirt_size', e.target.value as CfpTshirtSize || null)}
          className={`w-full bg-brand-gray-dark text-white rounded-lg px-4 py-3 border border-brand-gray-medium focus:outline-none focus:ring-2 transition-all appearance-none ${
            errors.tshirt_size ? 'ring-2 ring-red-500 focus:ring-red-500' : 'focus:ring-brand-primary focus:border-transparent'
          }`}
        >
          <option value="">Select size...</option>
          {TSHIRT_SIZES.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        {errors.tshirt_size && <p className="text-xs text-red-400 mt-1">{errors.tshirt_size}</p>}
      </div>

      <div>
        <label htmlFor="special_requirements" className="block text-sm font-medium text-white mb-2">
          Special requirements
        </label>
        <textarea
          id="special_requirements"
          value={formData.special_requirements || ''}
          onChange={(e) => handleChange('special_requirements', e.target.value)}
          placeholder="Accessibility needs, dietary restrictions, A/V requirements, or other needs we should know about"
          rows={4}
          className="w-full bg-brand-gray-dark text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 border border-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
        />
        <div className="flex justify-end mt-2">
          <p className="text-xs text-brand-gray-medium">
            {countWords(formData.special_requirements || '')}/250 words
          </p>
        </div>
      </div>
    </section>
  );
}
