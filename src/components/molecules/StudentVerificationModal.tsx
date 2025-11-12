/**
 * Student/Unemployed Verification Modal
 * Modal form for verifying student or unemployed status before purchasing discounted tickets
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';

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
    additionalInfo: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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
      if (!formData.studentId?.trim()) {
        errors.studentId = 'Student ID is required';
      }
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
        additionalInfo: '',
      });
      setError(null);
      setValidationErrors({});
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <style jsx>{`
            .modal-content::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
          >
            <motion.div
              className="modal-content relative w-full max-w-2xl bg-surface-section rounded-[28px] p-6 md:p-8 max-h-[90vh] overflow-y-auto"
              style={{
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none', // IE and Edge
              }}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
              aria-label="Close modal"
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2">
                Verify Your Status
              </h2>
              <p className="text-gray-400">
                Please provide your details to verify your eligibility for the discounted ticket.
                We&apos;ll review your information and send you a payment link within 24 hours.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
                  {error}
                </div>
              )}

              {/* Verification Type */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3">
                  I am a <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => handleInputChange('verificationType', 'student')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                      formData.verificationType === 'student'
                        ? 'bg-brand-primary text-black'
                        : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('verificationType', 'unemployed')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                      formData.verificationType === 'unemployed'
                        ? 'bg-brand-primary text-black'
                        : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                  >
                    Unemployed
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-white mb-2">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="John Doe"
                  className="w-full"
                  aria-invalid={!!validationErrors.name}
                  aria-describedby={validationErrors.name ? 'name-error' : undefined}
                />
                {validationErrors.name && (
                  <p id="name-error" className="text-red-400 text-sm mt-1">
                    {validationErrors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="john@example.com"
                  className="w-full"
                  aria-invalid={!!validationErrors.email}
                  aria-describedby={validationErrors.email ? 'email-error' : undefined}
                />
                {validationErrors.email && (
                  <p id="email-error" className="text-red-400 text-sm mt-1">
                    {validationErrors.email}
                  </p>
                )}
              </div>

              {/* Student-specific fields */}
              {formData.verificationType === 'student' && (
                <>
                  <div>
                    <label htmlFor="university" className="block text-sm font-semibold text-white mb-2">
                      University/School Name <span className="text-red-400">*</span>
                    </label>
                    <Input
                      id="university"
                      type="text"
                      value={formData.university}
                      onChange={(e) => handleInputChange('university', e.target.value)}
                      placeholder="ETH Zurich"
                      className="w-full"
                      aria-invalid={!!validationErrors.university}
                      aria-describedby={validationErrors.university ? 'university-error' : undefined}
                    />
                    {validationErrors.university && (
                      <p id="university-error" className="text-red-400 text-sm mt-1">
                        {validationErrors.university}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="studentId" className="block text-sm font-semibold text-white mb-2">
                      Student ID Number <span className="text-red-400">*</span>
                    </label>
                    <Input
                      id="studentId"
                      type="text"
                      value={formData.studentId}
                      onChange={(e) => handleInputChange('studentId', e.target.value)}
                      placeholder="123456789"
                      className="w-full"
                      aria-invalid={!!validationErrors.studentId}
                      aria-describedby={validationErrors.studentId ? 'studentId-error' : undefined}
                    />
                    {validationErrors.studentId && (
                      <p id="studentId-error" className="text-red-400 text-sm mt-1">
                        {validationErrors.studentId}
                      </p>
                    )}
                    <p className="text-gray-500 text-sm mt-1">
                      We&apos;ll verify this with your school. Please have your student ID ready.
                    </p>
                  </div>
                </>
              )}

              {/* Unemployed-specific fields */}
              {formData.verificationType === 'unemployed' && (
                <div>
                  <label htmlFor="linkedInUrl" className="block text-sm font-semibold text-white mb-2">
                    LinkedIn Profile URL <span className="text-red-400">*</span>
                  </label>
                  <Input
                    id="linkedInUrl"
                    type="url"
                    value={formData.linkedInUrl}
                    onChange={(e) => handleInputChange('linkedInUrl', e.target.value)}
                    placeholder="https://linkedin.com/in/johndoe"
                    className="w-full"
                    aria-invalid={!!validationErrors.linkedInUrl}
                    aria-describedby={validationErrors.linkedInUrl ? 'linkedIn-error' : undefined}
                  />
                  {validationErrors.linkedInUrl && (
                    <p id="linkedIn-error" className="text-red-400 text-sm mt-1">
                      {validationErrors.linkedInUrl}
                    </p>
                  )}
                  <p className="text-gray-500 text-sm mt-1">
                    We&apos;ll review your profile to verify your employment status.
                  </p>
                </div>
              )}

              {/* Additional Info */}
              <div>
                <label htmlFor="additionalInfo" className="block text-sm font-semibold text-white mb-2">
                  Additional Information (Optional)
                </label>
                <textarea
                  id="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                  placeholder="Any additional context that might help us verify your status..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all resize-none"
                />
              </div>

              {/* Info box */}
              <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-lg p-4">
                <p className="text-sm text-gray-300">
                  <strong className="text-white">What happens next?</strong>
                  <br />
                  After submitting, we&apos;ll review your information within 24 hours. We may contact
                  you to validate your student ID or unemployment documents. If approved,
                  you&apos;ll receive an email with a secure payment link to complete your purchase
                  at the discounted price.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="flex-1 bg-brand-primary text-black hover:bg-brand-dark"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Verification'}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

