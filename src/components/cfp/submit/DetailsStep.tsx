/**
 * Details Step
 * Title, abstract, level, tags, outline, and links
 */

import { ChevronLeft, X } from 'lucide-react';
import { Button, Heading, Input } from '@/components/atoms';
import type { CfpTag, CfpTalkLevel } from '@/lib/types/cfp';
import { LEVEL_INFO, FormData } from './types';

interface DetailsStepProps {
  formData: FormData;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  errors: Record<string, string>;
  isWorkshop: boolean;
  tagInput: string;
  setTagInput: (value: string) => void;
  suggestedTags: CfpTag[];
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function DetailsStep({
  formData,
  updateField,
  errors,
  isWorkshop,
  tagInput,
  setTagInput,
  suggestedTags,
  addTag,
  removeTag,
  onNext,
  onBack,
}: DetailsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <Heading level="h1" className="text-2xl font-bold text-white mb-2">
          {isWorkshop ? 'Workshop Details' : 'Talk Details'}
        </Heading>
        <p className="text-brand-gray-light">
          Tell us about your {isWorkshop ? 'workshop' : 'talk'}.
        </p>
      </div>

      <div className="bg-brand-gray-dark rounded-2xl p-6 space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-white mb-2">
            Title <span className="text-red-400">*</span>
          </label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="An engaging title for your session"
            fullWidth
            error={errors.title}
          />
        </div>

        {/* Abstract */}
        <div>
          <label htmlFor="abstract" className="block text-sm font-semibold text-white mb-2">
            Abstract <span className="text-red-400">*</span>
          </label>
          <textarea
            id="abstract"
            value={formData.abstract}
            onChange={(e) => updateField('abstract', e.target.value)}
            placeholder="Describe what attendees will learn and why they should attend..."
            rows={5}
            className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
          />
          <div className="flex justify-between mt-2">
            <p className={`text-xs ${errors.abstract ? 'text-red-400' : 'text-brand-gray-medium'}`}>
              {errors.abstract || 'Minimum 100 characters'}
            </p>
            <p className="text-xs text-brand-gray-medium">
              {formData.abstract.length} characters
            </p>
          </div>
        </div>

        {/* Level */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Difficulty Level <span className="text-red-400">*</span>
          </label>
          <div className="grid sm:grid-cols-3 gap-3">
            {(['beginner', 'intermediate', 'advanced'] as CfpTalkLevel[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => updateField('talk_level', level)}
                className={`p-3 rounded-lg text-left transition-all cursor-pointer ${
                  formData.talk_level === level
                    ? 'bg-brand-primary/20 border border-brand-primary'
                    : 'bg-brand-gray-darkest border border-transparent hover:border-brand-gray-medium'
                }`}
              >
                <div className="font-medium text-white capitalize">{level}</div>
                <div className="text-xs text-brand-gray-light mt-1">
                  {LEVEL_INFO[level]}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Tags <span className="text-red-400">*</span>
            <span className="font-normal text-brand-gray-medium ml-2">
              ({formData.tags.length}/5)
            </span>
          </label>

          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2 mb-3">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              placeholder="Type a tag and press Enter"
              fullWidth
              disabled={formData.tags.length >= 5}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestedTags
              .filter((t) => !formData.tags.includes(t.name))
              .slice(0, 15)
              .map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => addTag(tag.name)}
                  disabled={formData.tags.length >= 5}
                  className="px-3 py-1 bg-brand-gray-darkest text-brand-gray-light rounded-full text-sm hover:bg-brand-gray-medium hover:text-white transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  + {tag.name}
                </button>
              ))}
          </div>
          {errors.tags && (
            <p className="text-red-400 text-sm mt-2">{errors.tags}</p>
          )}
        </div>

        {/* Outline */}
        <div>
          <label htmlFor="outline" className="block text-sm font-semibold text-white mb-2">
            Outline <span className="text-brand-gray-medium">(optional)</span>
          </label>
          <textarea
            id="outline"
            value={formData.outline}
            onChange={(e) => updateField('outline', e.target.value)}
            placeholder="Break down the structure of your session..."
            rows={4}
            className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
          />
        </div>

        {/* Additional Notes */}
        <div>
          <label htmlFor="additional_notes" className="block text-sm font-semibold text-white mb-2">
            Notes for Reviewers <span className="text-brand-gray-medium">(optional)</span>
          </label>
          <textarea
            id="additional_notes"
            value={formData.additional_notes}
            onChange={(e) => updateField('additional_notes', e.target.value)}
            placeholder="Anything else reviewers should know..."
            rows={3}
            className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
          />
        </div>

        {/* Links */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="slides_url" className="block text-sm font-semibold text-white mb-2">
              Slides URL <span className="text-brand-gray-medium">(optional)</span>
            </label>
            <Input
              id="slides_url"
              value={formData.slides_url}
              onChange={(e) => updateField('slides_url', e.target.value)}
              placeholder="https://..."
              fullWidth
            />
          </div>
          <div>
            <label htmlFor="previous_recording_url" className="block text-sm font-semibold text-white mb-2">
              Previous Recording <span className="text-brand-gray-medium">(optional)</span>
            </label>
            <Input
              id="previous_recording_url"
              value={formData.previous_recording_url}
              onChange={(e) => updateField('previous_recording_url', e.target.value)}
              placeholder="https://youtube.com/..."
              fullWidth
            />
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
        <Button onClick={onNext} variant="primary" size="lg">
          Continue
        </Button>
      </div>
    </div>
  );
}
