/**
 * Sponsorship Inquiry Modal
 * Modal form for potential sponsors to reach out
 */

import React, { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';
import { AnimatePresence } from 'framer-motion';
import { Button, Input, Textarea } from '@/components/atoms';
import { OctagonAlertIcon, XIcon, CheckCircleIcon } from 'lucide-react';

export interface SponsorshipInquiryModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;
  /**
   * Callback to close the modal
   */
  onClose: () => void;
}

interface FormData {
  name: string;
  company: string;
  email: string;
  message: string;
}

/**
 * SponsorshipInquiryModal component
 * Displays a form for potential sponsors to submit inquiries
 */
export const SponsorshipInquiryModal: React.FC<SponsorshipInquiryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    company: '',
    email: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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

    if (!formData.company.trim()) {
      errors.company = 'Company is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email address';
    }

    if (!formData.message.trim()) {
      errors.message = 'Message is required';
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
      const response = await fetch('/api/sponsorship-inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit inquiry');
      }

      // Success
      setIsSuccess(true);
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
        company: '',
        email: '',
        message: '',
      });
      setError(null);
      setValidationErrors({});
      setIsSuccess(false);
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
            <DialogPanel className="relative w-full max-w-xl bg-brand-gray-darkest rounded-[28px] p-6 md:p-8 max-h-[90vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 cursor-pointer w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-gray-dark transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-primary"
                aria-label="Close modal"
                autoFocus
              >
                <XIcon size={20} className="text-brand-white" />
              </button>

              {isSuccess ? (
                /* Success State */
                <div className="text-center py-8">
                  <div className="flex justify-center mb-4">
                    <CheckCircleIcon size={64} className="text-green-500" />
                  </div>
                  <DialogTitle className="text-xl font-bold text-brand-white mb-3">
                    Thank You!
                  </DialogTitle>
                  <p className="text-brand-gray-light mb-6">
                    Your sponsorship inquiry has been submitted successfully.
                    We&apos;ll get back to you within 24-48 hours.
                  </p>
                  <Button variant="primary" onClick={onClose}>
                    Close
                  </Button>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="mb-6">
                    <DialogTitle className="text-xl font-bold text-brand-white mb-2">
                      Become a Sponsor
                    </DialogTitle>
                    <p className="text-brand-gray-light">
                      Interested in sponsoring ZurichJS Conference 2026? Fill out the form below
                      and we&apos;ll get back to you with more details.
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Error message */}
                    {error && (
                      <p className="border-2 border-brand-red/50 rounded-lg p-4 text-brand-red">
                        <OctagonAlertIcon size={16} className="stroke-brand-red inline-block mr-1 mb-[0.1em]" />&nbsp;
                        {error}
                      </p>
                    )}

                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-brand-white mb-2">
                        Your Name <span className="text-brand-red">*</span>
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

                    {/* Company */}
                    <div>
                      <label htmlFor="company" className="block text-sm font-semibold text-brand-white mb-2">
                        Company <span className="text-brand-red">*</span>
                      </label>
                      <Input
                        id="company"
                        type="text"
                        value={formData.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        placeholder="Acme Inc."
                        required
                        className="w-full"
                        aria-invalid={!!validationErrors.company}
                        aria-describedby={validationErrors.company ? 'company-error' : undefined}
                      />
                      {validationErrors.company && (
                        <p id="company-error" className="text-brand-red text-sm font-medium mt-1">
                          {validationErrors.company}
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
                        placeholder="john@acme.com"
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

                    {/* Message */}
                    <div>
                      <label htmlFor="message" className="block text-sm font-semibold text-brand-white mb-2">
                        Message <span className="text-brand-red">*</span>
                      </label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => handleInputChange('message', e.target.value)}
                        placeholder="Tell us about your company and what sponsorship tier you're interested in..."
                        rows={4}
                        className="w-full"
                        aria-invalid={!!validationErrors.message}
                        aria-describedby={validationErrors.message ? 'message-error' : undefined}
                      />
                      {validationErrors.message && (
                        <p id="message-error" className="text-brand-red text-sm font-medium mt-1">
                          {validationErrors.message}
                        </p>
                      )}
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-col-reverse justify-between sm:flex-row gap-3 pt-2">
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
                        {isSubmitting ? 'Sending...' : 'Send Inquiry'}
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
