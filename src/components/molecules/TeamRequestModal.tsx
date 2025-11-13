/**
 * Team Request Modal
 * Captures team purchase information and sends request to sales team
 */

import React, { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';
import { AnimatePresence } from 'framer-motion';
import {XIcon, CheckCircle, CheckIcon, OctagonAlertIcon} from 'lucide-react';
import {Button, Input, Textarea} from '@/components/atoms';

export interface TeamRequestData {
  name: string;
  email: string;
  company: string;
  ticketType: string;
  quantity: number;
  message?: string;
}

export interface TeamRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketType: string;
  quantity: number;
  onSubmit: (data: TeamRequestData) => Promise<void>;
}

export const TeamRequestModal: React.FC<TeamRequestModalProps> = ({
  isOpen,
  onClose,
  ticketType,
  quantity,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<TeamRequestData>({
    name: '',
    email: '',
    company: '',
    ticketType,
    quantity,
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Update formData when modal opens with new props
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        email: '',
        company: '',
        ticketType,
        quantity,
        message: '',
      });
      setError(null);
      setValidationErrors({});
      setIsSuccess(false);
    }
  }, [isOpen, ticketType, quantity]);

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

    if (!formData.company.trim()) {
      errors.company = 'Company name is required';
    }

    if (!formData.quantity || formData.quantity < 1) {
      errors.quantity = 'Quantity must be at least 1';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      setIsSuccess(true);

      // Close modal after showing success message
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit team request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value, 10) || 0 : value,
    }));
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
          {/* Backdrop */}
          <DialogBackdrop className="fixed inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Center container */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel className="relative w-full max-w-lg bg-surface-section rounded-[28px] p-6 md:p-8 max-h-[90vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 cursor-pointer w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-700 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-primary"
            aria-label="Close modal"
            autoFocus
          >
            <XIcon size={20} className="fill-brand-white" />
          </button>

          {isSuccess ? (
            // Success State
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-success" />
              </div>
              <h3 className="text-xl font-bold text-brand-white mb-2">Request Sent!</h3>
              <p className="text-brand-gray-light">
                We&apos;ll be in touch shortly with your custom team package quote.
              </p>
            </div>
          ) : (
            // Form State
            <div className="space-y-5">
              {/* Header */}
              <div className="space-y-2.5">
                <DialogTitle className="text-xl font-bold text-brand-white mb-2">
                  Team Package Request
                </DialogTitle>
                <p className="text-sm text-brand-gray-light">
                  Get exclusive team discounts and simplified invoicing
                </p>
                <ul className="space-y-1 text-sm text-brand-gray-light">
                  <li className="flex items-center gap-2">
                    <CheckIcon size={16} className="stroke-brand-green" />
                    <span>Custom team pricing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon size={16} className="stroke-brand-green" />
                    <span>Single invoice for your whole team</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon size={16} className="stroke-brand-green" />
                    <span>Bank transfer payment option</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon size={16} className="stroke-brand-green" />
                    <span>Dedicated support from our team</span>
                  </li>
                </ul>
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

                {/* Team Details */}
                <div className="bg-brand-gray-dark/50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-brand-gray-light mb-1">Ticket Type</p>
                      <p className="text-lg font-semibold text-brand-white">{ticketType}</p>
                    </div>
                    <div className="flex items-end gap-2">
                      <div>
                        <label htmlFor="quantity" className="block text-sm text-brand-gray-light mb-1">
                          Quantity
                        </label>
                        <Input
                          type="number"
                          id="quantity"
                          name="quantity"
                          min={1}
                          required
                          value={formData.quantity}
                          onChange={handleChange}
                          className="w-20 text-center"
                          aria-invalid={!!validationErrors.quantity}
                          aria-describedby={validationErrors.quantity ? 'quantity-error' : undefined}
                        />
                      </div>
                    </div>
                  </div>
                  {validationErrors.quantity && (
                    <p id="quantity-error" className="text-brand-red text-sm font-medium mt-2">
                      {validationErrors.quantity}
                    </p>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-brand-white mb-2">
                    Your Name <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
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
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@company.com"
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

                {/* Company */}
                <div>
                  <label htmlFor="company" className="block text-sm font-semibold text-brand-white mb-2">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="text"
                    id="company"
                    name="company"
                    required
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Acme Inc."
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

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-brand-white mb-2">
                    Additional Information (Optional)
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    rows={3}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="Any specific requirements or questions..."
                  />
                </div>

                <p className="text-xs text-brand-gray-medium">
                  Sponsors also get tickets, as well as brand exposure and recruitment opportunities. <a href="mailto:hello@zurichjs.com" className="text-brand-blue hover:text-brand-gray-lightest duration-300 ease-in-out">Reach out</a> for a sponsorship package.
                </p>

                {/* Actions */}
                <div className="flex flex-col justify-between sm:flex-row gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="bg-brand-primary text-black hover:bg-brand-dark"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Sending...' : 'Request Quote'}
                  </Button>
                </div>
              </form>
            </div>
          )}
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
