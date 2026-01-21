/**
 * Travel Section
 */

import { Plane, Check } from 'lucide-react';
import { AirportInput } from '@/components/atoms';
import type { CfpAssistanceType } from '@/lib/types/cfp';
import type { ProfileFormProps, TravelOption } from './types';

interface TravelSectionProps extends ProfileFormProps {
  travelOption: TravelOption | null;
  onTravelOptionChange: (option: TravelOption) => void;
  isEuropean: boolean;
}

export function TravelSection({
  formData,
  errors,
  handleChange,
  travelOption,
  onTravelOptionChange,
  isEuropean,
}: TravelSectionProps) {
  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Plane className="w-5 h-5 text-brand-primary" />
          <h2 className="text-lg font-semibold text-white">Travel</h2>
        </div>
        <p className="text-sm text-brand-gray-light">
          As a non-profit community conference, we&apos;ll try our best to support you with travel and accommodation.
        </p>
      </div>

      <ul className="text-sm text-brand-gray-light space-y-1 list-disc list-inside">
        <li>
          for <strong className="text-white">European travel</strong> (flight, train, driving, cycling etc): we can help out with up to <strong className="text-brand-primary">250 CHF/EUR</strong>.
        </li>
        <li>
          for <strong className="text-white">outside Europe</strong>, we can only make decisions on a case-by-case basis after the talk selection.
        </li>
      </ul>

      <p className="text-sm text-brand-gray-light">
        <strong className="text-brand-primary">If your company can cover travel costs</strong>, we&apos;ll be more than happy to include them as a &quot;Supporter&quot; sponsor with all the associated perks.
      </p>

      {/* Travel Option Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => onTravelOptionChange('employer_covers')}
          className={`cursor-pointer p-4 rounded-xl text-sm font-medium transition-all border text-center ${
            travelOption === 'employer_covers'
              ? 'bg-white text-black border-white'
              : 'bg-transparent text-white border-brand-gray-medium hover:border-brand-gray-light'
          }`}
        >
          My employer covers travel
        </button>
        <button
          type="button"
          onClick={() => onTravelOptionChange('self_managed')}
          className={`cursor-pointer p-4 rounded-xl text-sm font-medium transition-all border text-center ${
            travelOption === 'self_managed'
              ? 'bg-white text-black border-white'
              : 'bg-transparent text-white border-brand-gray-medium hover:border-brand-gray-light'
          }`}
        >
          I&apos;ll sort it on my own
        </button>
        <button
          type="button"
          onClick={() => onTravelOptionChange('need_assistance')}
          className={`cursor-pointer p-4 rounded-xl text-sm font-medium transition-all border text-center ${
            travelOption === 'need_assistance'
              ? 'bg-white text-black border-white'
              : 'bg-transparent text-white border-brand-gray-medium hover:border-brand-gray-light'
          }`}
        >
          I need travel assistance
        </button>
      </div>

      {/* Assistance Type Selection */}
      {travelOption === 'need_assistance' && (
        <div className="space-y-4 pt-4 border-t border-brand-gray-medium">
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              What do you need help with?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { value: 'travel', label: 'Travel Only' },
                { value: 'accommodation', label: 'Accommodation Only' },
                { value: 'both', label: 'Both' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleChange('assistance_type', option.value as CfpAssistanceType)}
                  className={`cursor-pointer px-3 py-2 rounded-lg text-sm font-medium transition-all border text-center ${
                    formData.assistance_type === option.value
                      ? 'bg-brand-primary text-black border-brand-primary'
                      : 'bg-brand-gray-dark text-white border-brand-gray-medium hover:border-brand-primary hover:text-brand-primary'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {formData.assistance_type && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Check className="w-4 h-4" />
              <span>
                {isEuropean
                  ? formData.assistance_type === 'travel'
                    ? "We'll support your travel with up to 250 CHF/EUR"
                    : formData.assistance_type === 'accommodation'
                    ? "We'll arrange your accommodation"
                    : "We'll support your travel (up to 250 CHF/EUR) and arrange accommodation"
                  : `We'll evaluate your ${formData.assistance_type === 'both' ? 'travel & accommodation' : formData.assistance_type} support after talk selection`}
              </span>
            </div>
          )}

          {/* Airport Field */}
          {(formData.assistance_type === 'travel' || formData.assistance_type === 'both') && (
            <div>
              <label htmlFor="departure_airport" className="block text-sm font-medium text-white mb-2">
                Where are you flying from?
              </label>
              <AirportInput
                id="departure_airport"
                value={formData.departure_airport ?? null}
                onChange={(value) => handleChange('departure_airport', value)}
                placeholder="Search by city or airport code..."
                error={errors.departure_airport}
              />
              <p className="text-xs text-brand-gray-medium mt-1">
                Could be your closest airport or another location if you&apos;re already travelling
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
