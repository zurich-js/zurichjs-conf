/**
 * Personal Information Section
 */

import { User } from 'lucide-react';
import { Input, SearchableSelect } from '@/components/atoms';
import { COUNTRIES } from '@/lib/constants/countries';
import type { ProfileFormProps } from './types';

export function PersonalInfoSection({ formData, errors, handleChange }: ProfileFormProps) {
  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <User className="w-5 h-5 text-brand-primary" />
          <h2 className="text-lg font-semibold text-white">Personal information</h2>
        </div>
        <p className="text-sm text-brand-gray-light">
          We&apos;ll use this information on all marketing materials, including, but not limited to the website and social media.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-white mb-2">
            First name<span className="text-red-400">*</span>
          </label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => handleChange('first_name', e.target.value)}
            placeholder="John"
            fullWidth
            error={errors.first_name}
          />
        </div>
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-white mb-2">
            Last name<span className="text-red-400">*</span>
          </label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => handleChange('last_name', e.target.value)}
            placeholder="Doe"
            fullWidth
            error={errors.last_name}
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
          E-mail address<span className="text-red-400">*</span>
        </label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="john@example.com"
          fullWidth
          disabled
        />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-white mb-2">
          Bio<span className="text-red-400">*</span>
        </label>
        <textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => handleChange('bio', e.target.value)}
          placeholder="Tell us about yourself, your experience, and what you're passionate about."
          rows={4}
          className="w-full bg-brand-gray-dark text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 border border-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
        />
        <div className="flex justify-end mt-2">
          <p className={`text-xs ${countWords(formData.bio || '') > 250 ? 'text-red-400' : 'text-brand-gray-medium'}`}>
            {countWords(formData.bio || '')}/250 words
          </p>
        </div>
        {errors.bio && <p className="text-xs text-red-400 mt-1">{errors.bio}</p>}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="job_title" className="block text-sm font-medium text-white mb-2">
            Job title<span className="text-red-400">*</span>
          </label>
          <Input
            id="job_title"
            value={formData.job_title}
            onChange={(e) => handleChange('job_title', e.target.value)}
            placeholder="Senior Developer"
            fullWidth
            error={errors.job_title}
          />
        </div>
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-white mb-2">
            Company<span className="text-red-400">*</span>
          </label>
          <Input
            id="company"
            value={formData.company}
            onChange={(e) => handleChange('company', e.target.value)}
            placeholder="Acme Inc."
            fullWidth
            error={errors.company}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-white mb-2">
            City<span className="text-red-400">*</span>
          </label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="Zurich"
            fullWidth
            error={errors.city}
          />
        </div>
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-white mb-2">
            Country<span className="text-red-400">*</span>
          </label>
          <SearchableSelect
            id="country"
            value={formData.country}
            onChange={(value) => handleChange('country', value)}
            options={COUNTRIES}
            placeholder="Select country"
            error={errors.country}
          />
        </div>
      </div>
    </section>
  );
}
