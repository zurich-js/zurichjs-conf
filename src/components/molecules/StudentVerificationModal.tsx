/**
 * Student/Unemployed Verification Modal
 * Modal form for verifying student or unemployed status before purchasing discounted tickets
 */

import React, { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop, RadioGroup, Radio, Field, Label as HeadlessLabel } from '@headlessui/react';
import { AnimatePresence } from 'framer-motion';
import { Button, Input, Textarea } from '@/components/atoms';
import {OctagonAlertIcon, XIcon} from 'lucide-react';

export interface StudentVerificationModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;
  /**
   * Callback to close the modal
   */
  onClose: () => void;
  /**
   * Callback when verification is submitted successfully
   */
  onVerificationSubmit: (email: string, verificationId: string) => void;
  /**
   * Stripe price ID to purchase after verification
   */
  priceId: string;
}

type VerificationType = 'student' | 'unemployed';

interface FormData {
  name: string;
  email: string;
  verificationType: VerificationType;
  studentId?: string;
  university?: string;
  linkedInUrl?: string;
  ravRegistrationDate?: string;
  additionalInfo?: string;
}

/**
 * StudentVerificationModal component
 * Displays a form for users to submit verification details
 */
export const StudentVerificationModal: React.FC<StudentVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerificationSubmit,
  priceId,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    verificationType: 'student',
    studentId: '',
    university: '',
    linkedInUrl: '',
    ravRegistrationDate: '',
    additionalInfo: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const radioOptions = [
    {
      label: 'A student',
      key: 'student' as VerificationType,
    },
    {
      label: 'Unemployed',
      key: 'unemployed' as VerificationType,
    }
  ]

  // Handle form input changes
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email address';
    }

    if (formData.verificationType === 'student') {
      if (!formData.university?.trim()) {
        errors.university = 'University name is required';
      }
    } else if (formData.verificationType === 'unemployed') {
      if (!formData.linkedInUrl?.trim()) {
        errors.linkedInUrl = 'LinkedIn profile URL is required';
      } else if (!/^https?:\/\/(www\.)?linkedin\.com\/.+/.test(formData.linkedInUrl)) {
        errors.linkedInUrl = 'Please enter a valid LinkedIn profile URL';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/verify-student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          priceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification submission failed');
      }

      // Success - redirect to Stripe checkout or call the callback
      onVerificationSubmit(formData.email, data.verificationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        email: '',
        verificationType: 'student',
        studentId: '',
        university: '',
        linkedInUrl: '',
        ravRegistrationDate: '',
        additionalInfo: '',
      });
      setError(null);
      setValidationErrors({});
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
          {/* Backdrop */}
          <DialogBackdrop className="fixed inset-0 bg-brand-black/80 backdrop-blur-sm" />

          {/* Center container */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel className="relative w-full max-w-2xl bg-brand-gray-darkest rounded-[28px] p-6 md:p-8 max-h-[90vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 cursor-pointer w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-gray-dark transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-primary"
              aria-label="Close modal"
              autoFocus
            >
              <XIcon size={20} className="fill-brand-white" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <DialogTitle className="text-xl font-bold text-brand-white mb-2">
                Verify Your Status
              </DialogTitle>
              <p className="text-brand-gray-light">
                Please provide your details to verify your eligibility for the discounted ticket.
                Over the next few days, we&#39;ll review your information; we might reach out for further verification.
                Once verification is successeful, you&#39;ll get a payment link.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error message */}
              {error && (
                <p className="border-2 border-brand-red/50 rounded-lg p-4 text-brand-red">
                  <OctagonAlertIcon size={16} className="stroke-brand-red inline-block mr-1 mb-[0.1em]" />&nbsp;
                  {error}
                </p>
              )}

              {/* Verification Type */}
              <RadioGroup
                value={formData.verificationType}
                onChange={(value) => handleInputChange('verificationType', value)}
              >
                <label className="block text-sm font-semibold text-brand-white mb-3">
                  I am <span className="text-brand-red">*</span>
                </label>
                <div className="flex w-fit gap-2">
                  {radioOptions.map((option) => (
                    <Field key={option.key} className="">
                      <Radio
                        value={option.key}
                        className="w-fit flex items-center px-2.5 py-2.5 shrink-0 rounded-full font-semibold group
                      transition-all cursor-pointer data-checked:text-brand-primary border border-brand-gray-medium
                      text-brand-white hover:text-gray-300"
                      >
                        <div className="size-4 shrink-0 rounded-full bg-brand-gray-medium group-data-[checked]:bg-brand-primary transition-colors duration-300 ease-in-out" />
                        <HeadlessLabel className="px-2.5 pointer-events-none">
                            {option.label}
                        </HeadlessLabel>
                      </Radio>
                    </Field>
                  ))}
                </div>
              </RadioGroup>

              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-brand-white mb-2">
                  Full Name <span className="text-brand-red">*</span>
                </label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full"
                  aria-invalid={!!validationErrors.name}
                  aria-describedby={validationErrors.name ? 'name-error' : undefined}
                />
                {validationErrors.name && (
                  <p id="name-error" className="text-brand-red text-sm font-medium mt-1">
                    {validationErrors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-brand-white mb-2">
                  Email Address <span className="text-brand-red">*</span>
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="john@example.com"
                  required
                  className="w-full"
                  aria-invalid={!!validationErrors.email}
                  aria-describedby={validationErrors.email ? 'email-error' : undefined}
                />
                {validationErrors.email && (
                  <p id="email-error" className="text-brand-red text-sm font-medium mt-1">
                    {validationErrors.email}
                  </p>
                )}
              </div>

              {/* Student-specific fields */}
              {formData.verificationType === 'student' && (
                <>
                  <div>
                    <label htmlFor="university" className="block text-sm font-semibold text-brand-white mb-2">
                      University/School Name <span className="text-brand-red">*</span>
                    </label>
                    <Input
                      id="university"
                      type="text"
                      value={formData.university}
                      onChange={(e) => handleInputChange('university', e.target.value)}
                      placeholder="ETH Zurich"
                      required
                      className="w-full"
                      aria-invalid={!!validationErrors.university}
                      aria-describedby={validationErrors.university ? 'university-error' : undefined}
                    />
                    {validationErrors.university && (
                      <p id="university-error" className="text-brand-red text-sm font-medium mt-1">
                        {validationErrors.university}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="studentId" className="block text-sm font-semibold text-brand-white mb-2">
                      Student ID Number <span className="text-brand-gray-light font-normal">(if you have one)</span>
                    </label>
                    <Input
                      id="studentId"
                      type="text"
                      value={formData.studentId}
                      onChange={(e) => handleInputChange('studentId', e.target.value)}
                      placeholder="123456789"
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {/* Unemployed-specific fields */}
              {formData.verificationType === 'unemployed' && (
                <>
                  <div>
                    <label htmlFor="linkedInUrl" className="block text-sm font-semibold text-brand-white mb-2">
                      LinkedIn Profile URL <span className="text-brand-red">*</span>
                    </label>
                    <Input
                      id="linkedInUrl"
                      type="url"
                      value={formData.linkedInUrl}
                      onChange={(e) => handleInputChange('linkedInUrl', e.target.value)}
                      placeholder="https://linkedin.com/in/johndoe"
                      required
                      className="w-full"
                      aria-invalid={!!validationErrors.linkedInUrl}
                      aria-describedby={validationErrors.linkedInUrl ? 'linkedIn-error' : undefined}
                    />
                    {validationErrors.linkedInUrl && (
                      <p id="linkedIn-error" className="text-brand-red text-sm font-medium mt-1">
                        {validationErrors.linkedInUrl}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="ravRegistrationDate" className="block text-sm font-semibold text-brand-white mb-2">
                      RAV Registration Date <span className="text-brand-gray-light font-normal">(Switzerland only)</span>
                    </label>
                    <p className="text-xs text-brand-gray-light mb-2">
                      Leave blank if outside Switzerland. You can add details in the comments below.
                    </p>
                    <Input
                      id="ravRegistrationDate"
                      type="date"
                      value={formData.ravRegistrationDate}
                      onChange={(e) => handleInputChange('ravRegistrationDate', e.target.value)}
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {/* Additional Info */}
              <div>
                <label htmlFor="additionalInfo" className="block text-sm font-semibold text-brand-white mb-2">
                  Additional Information (Optional)
                </label>
                <Textarea
                  id="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                  placeholder="Any additional context that might help us verify your status..."
                  rows={3}
                  className="w-full"
                />
              </div>

              {/* Info box */}
              <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-lg p-4">
                <p className="text-sm text-gray-300">
                  <strong className="text-brand-white">What happens next?</strong>
                  <br />
                  After submitting, we&apos;ll review your information within 24 hours.
                  {formData.verificationType === 'student'
                    ? ' We may contact you to verify your student ID with your school.'
                    : ' We may contact you to verify your LinkedIn profile and RAV registration documents.'
                  }
                  {' '}If approved, you&apos;ll receive an email with a secure payment link to complete
                  your purchase at the discounted price.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex flex-col justify-between sm:flex-row gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Verification'}
                </Button>
              </div>
            </form>
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

