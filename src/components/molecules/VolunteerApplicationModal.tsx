/**
 * Volunteer Application Modal
 * Form for submitting a volunteer application
 */

import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';
import { AnimatePresence } from 'framer-motion';
import { Button, Input, Textarea } from '@/components/atoms';
import { XIcon } from 'lucide-react';
import { useSubmitVolunteerApplication, ApiError } from '@/hooks/useVolunteer';

export interface VolunteerApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleId: string;
  roleTitle: string;
  hasExclusions: boolean;
  onSuccess: (applicationId: string) => void;
}

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  website_url: string;
  motivation: string;
  availability: string;
  relevant_experience: string;
  affiliation: string;
  notes: string;
  commitment_confirmed: boolean;
  exclusions_confirmed: boolean;
  contact_consent_confirmed: boolean;
}

const INITIAL_FORM: FormState = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  linkedin_url: '',
  website_url: '',
  motivation: '',
  availability: '',
  relevant_experience: '',
  affiliation: '',
  notes: '',
  commitment_confirmed: false,
  exclusions_confirmed: false,
  contact_consent_confirmed: false,
};

export function VolunteerApplicationModal({
  isOpen,
  onClose,
  roleId,
  roleTitle,
  hasExclusions,
  onSuccess,
}: VolunteerApplicationModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submitMutation = useSubmitVolunteerApplication();

  const updateField = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    const newErrors: Record<string, string> = {};
    if (!form.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!form.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Invalid email';
    if (!form.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!form.linkedin_url.trim()) newErrors.linkedin_url = 'LinkedIn profile is required';
    if (!form.motivation.trim()) newErrors.motivation = 'Motivation is required';
    else if (form.motivation.trim().length < 50) newErrors.motivation = 'Please provide at least 50 characters';
    if (!form.availability.trim()) newErrors.availability = 'Availability is required';
    if (!form.relevant_experience.trim()) newErrors.relevant_experience = 'Experience is required';
    else if (form.relevant_experience.trim().length < 20) newErrors.relevant_experience = 'Please provide at least 20 characters';
    if (!form.commitment_confirmed) newErrors.commitment_confirmed = 'You must confirm your commitment';
    if (!form.exclusions_confirmed) newErrors.exclusions_confirmed = 'You must acknowledge what is not included';
    if (!form.contact_consent_confirmed) newErrors.contact_consent_confirmed = 'You must consent to being contacted';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const result = await submitMutation.mutateAsync({
        ...form,
        role_id: roleId,
        commitment_confirmed: true as const,
        exclusions_confirmed: true as const,
        contact_consent_confirmed: true as const,
      });
      setForm(INITIAL_FORM);
      setErrors({});
      onSuccess(result.applicationId);
    } catch (err) {
      if (err instanceof ApiError && err.issues?.length) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of err.issues) {
          const field = issue.path?.[0];
          if (field) {
            fieldErrors[field] = issue.message;
          }
        }
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        } else {
          setErrors({ submit: err.message });
        }
      } else {
        const message = err instanceof Error ? err.message : 'Failed to submit application';
        setErrors({ submit: message });
      }
    }
  };

  const handleClose = () => {
    if (!submitMutation.isPending) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
          <DialogBackdrop className="fixed inset-0 bg-brand-black/80 backdrop-blur-sm" />

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel className="relative w-full max-w-2xl max-h-[calc(100dvh-0.75rem)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-brand-gray-darkest rounded-t-[28px] p-4 xs:p-5 sm:max-h-[90vh] sm:rounded-[28px] sm:p-6 md:p-8">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-brand-gray-dark transition-colors cursor-pointer"
                aria-label="Close"
              >
                <XIcon className="w-5 h-5 text-brand-gray-light" />
              </button>

              <DialogTitle className="text-2xl font-bold text-brand-white mb-1">
                Apply to Volunteer
              </DialogTitle>
              <p className="text-brand-gray-light mb-6">
                {roleTitle}
              </p>

              {errors.submit && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                  <p className="text-sm text-red-400">{errors.submit}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Personal Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-brand-gray-light uppercase tracking-wide">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-brand-gray-light mb-1">First Name *</label>
                      <Input
                        value={form.first_name}
                        onChange={(e) => updateField('first_name', e.target.value)}
                        error={errors.first_name}
                        fullWidth
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-brand-gray-light mb-1">Last Name *</label>
                      <Input
                        value={form.last_name}
                        onChange={(e) => updateField('last_name', e.target.value)}
                        error={errors.last_name}
                        fullWidth
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-brand-gray-light mb-1">Email *</label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        error={errors.email}
                        fullWidth
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-brand-gray-light mb-1">Phone *</label>
                      <Input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        error={errors.phone}
                        fullWidth
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-brand-gray-light mb-1">LinkedIn Profile *</label>
                      <Input
                        value={form.linkedin_url}
                        onChange={(e) => updateField('linkedin_url', e.target.value)}
                        error={errors.linkedin_url}
                        placeholder="linkedin.com/in/yourprofile"
                        fullWidth
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-brand-gray-light mb-1">Website / GitHub</label>
                      <Input
                        value={form.website_url}
                        onChange={(e) => updateField('website_url', e.target.value)}
                        error={errors.website_url}
                        placeholder="Optional"
                        fullWidth
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-brand-gray-light mb-1">Company / Community</label>
                    <Input
                      value={form.affiliation}
                      onChange={(e) => updateField('affiliation', e.target.value)}
                      placeholder="Optional"
                      fullWidth
                    />
                  </div>
                </div>

                {/* Motivation & Experience */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-brand-gray-light uppercase tracking-wide">
                    Your Application
                  </h3>
                  <div>
                    <label className="block text-sm text-brand-gray-light mb-1">
                      Why do you want to volunteer? *
                    </label>
                    <Textarea
                      value={form.motivation}
                      onChange={(e) => updateField('motivation', e.target.value)}
                      error={errors.motivation}
                      rows={4}
                      fullWidth
                      placeholder="Tell us why you'd like to volunteer and what you'd bring to the role (min. 50 characters)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-brand-gray-light mb-1">
                      Relevant experience *
                    </label>
                    <Textarea
                      value={form.relevant_experience}
                      onChange={(e) => updateField('relevant_experience', e.target.value)}
                      error={errors.relevant_experience}
                      rows={3}
                      fullWidth
                      placeholder="Any relevant experience, skills, or community involvement (min. 20 characters)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-brand-gray-light mb-1">
                      Availability *
                    </label>
                    <Textarea
                      value={form.availability}
                      onChange={(e) => updateField('availability', e.target.value)}
                      error={errors.availability}
                      rows={2}
                      fullWidth
                      placeholder="When are you available? Include specific dates/times if possible"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-brand-gray-light mb-1">
                      Additional notes
                    </label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => updateField('notes', e.target.value)}
                      rows={2}
                      fullWidth
                      placeholder="Anything else you'd like us to know (optional)"
                    />
                  </div>
                </div>

                {/* Confirmations */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-brand-gray-light uppercase tracking-wide">
                    Confirmations
                  </h3>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.commitment_confirmed}
                      onChange={(e) => updateField('commitment_confirmed', e.target.checked)}
                      className="mt-1 rounded border-brand-gray-medium text-brand-primary focus:ring-brand-primary bg-brand-gray-dark"
                    />
                    <span className="text-sm text-brand-gray-light">
                      I understand the time commitment and responsibilities of this volunteer role. *
                    </span>
                  </label>
                  {errors.commitment_confirmed && (
                    <p className="text-xs text-red-400 ml-7">{errors.commitment_confirmed}</p>
                  )}

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.exclusions_confirmed}
                      onChange={(e) => updateField('exclusions_confirmed', e.target.checked)}
                      className="mt-1 rounded border-brand-gray-medium text-brand-primary focus:ring-brand-primary bg-brand-gray-dark"
                    />
                    <span className="text-sm text-brand-gray-light">
                      {hasExclusions
                        ? 'I understand that travel and accommodation are not included unless otherwise stated. *'
                        : 'I understand the terms and conditions of this volunteer role. *'}
                    </span>
                  </label>
                  {errors.exclusions_confirmed && (
                    <p className="text-xs text-red-400 ml-7">{errors.exclusions_confirmed}</p>
                  )}

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.contact_consent_confirmed}
                      onChange={(e) => updateField('contact_consent_confirmed', e.target.checked)}
                      className="mt-1 rounded border-brand-gray-medium text-brand-primary focus:ring-brand-primary bg-brand-gray-dark"
                    />
                    <span className="text-sm text-brand-gray-light">
                      I consent to being contacted about this volunteer role. *
                    </span>
                  </label>
                  {errors.contact_consent_confirmed && (
                    <p className="text-xs text-red-400 ml-7">{errors.contact_consent_confirmed}</p>
                  )}
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={submitMutation.isPending}
                    disabled={submitMutation.isPending}
                    className="w-full"
                  >
                    Submit Application
                  </Button>
                </div>
              </form>
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
