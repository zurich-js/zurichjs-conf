/**
 * Contact Page
 * General-purpose contact form for inquiries and feedback. Submits to
 * /api/contact, which emails the organizers — works for every visitor
 * regardless of whether they have a mail client configured.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import posthog from 'posthog-js';
import { Button, Heading, Kicker } from '@/components/atoms';
import { SEO } from '@/components/SEO';
import { CONTACT_TYPES, type ContactType } from '@/lib/validations/contact';
import { CheckCircle, AlertCircle, Mail, ChevronDown } from 'lucide-react';
import { SiteFooter, ShapedSection } from '@/components/organisms';
import { useContactForm } from '@/hooks/useContactForm';

interface FormData {
  name: string;
  email: string;
  contactType: ContactType;
  message: string;
  website: string; // Honeypot field
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

const initialFormData: FormData = {
  name: '',
  email: '',
  contactType: 'inquiry',
  message: '',
  website: '',
};

function isContactType(value: unknown): value is ContactType {
  return CONTACT_TYPES.some((t) => t.value === value);
}

export default function ContactPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const {
    submit,
    isPending: isSubmitting,
    isSuccess,
    error: submitError,
    reset,
  } = useContactForm();

  // Prefill the contact type from the ?type= query parameter (e.g. footer links)
  useEffect(() => {
    if (router.isReady) {
      const typeParam = router.query.type;
      if (isContactType(typeParam)) {
        setFormData((prev) => ({ ...prev, contactType: typeParam }));
      }
    }
  }, [router.isReady, router.query.type]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof FormErrors];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Capture PostHog session info (if available)
    const posthogSessionId = (() => {
      try {
        return posthog.get_session_id() || undefined;
      } catch {
        return undefined;
      }
    })();
    const posthogDistinctId = (() => {
      try {
        return posthog.get_distinct_id() || undefined;
      } catch {
        return undefined;
      }
    })();

    // Errors are surfaced via the mutation's `error` state; swallow the
    // rejection here so it doesn't bubble as an unhandled promise.
    try {
      await submit({
        name: formData.name,
        email: formData.email,
        contactType: formData.contactType,
        message: formData.message,
        website: formData.website, // Honeypot
        posthogSessionId,
        posthogDistinctId,
      });
    } catch {
      // no-op — `submitError` is derived from the mutation
    }
  };

  const handleSendAnother = () => {
    setFormData((prev) => ({ ...initialFormData, contactType: prev.contactType }));
    setErrors({});
    reset();
  };

  // Light-themed input styles
  const inputBaseStyles =
    'w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all duration-200';
  const inputErrorStyles = 'border-red-500 focus:ring-red-500';

  return (
    <>
      <SEO
        title="Contact Us | ZurichJS Conference 2026"
        description="Questions about the conference, sponsorship, or speaking? Or just want to share feedback? Send us a message and our team will get back to you."
        canonical="/contact"
      />

      <main className="min-h-screen bg-white">
        {/* Header Section */}
        <div className="bg-brand-black pt-28 pb-16 md:pt-36 md:pb-20">
          <div className="max-w-screen-lg mx-auto px-4">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-8 h-8 text-brand-primary" />
              <Kicker>Get in touch</Kicker>
            </div>
            <Heading level="h1" className="mb-4">
              Contact Us
            </Heading>
            <p className="text-brand-gray-light text-lg max-w-2xl">
              Whether you have a question about the conference, want to become a
              sponsor, are interested in speaking, or just want to share some
              feedback — we&apos;d love to hear from you. We&apos;ll get back to you
              as soon as we can.
            </p>
          </div>
        </div>

        {/* Form Section - extra padding at bottom to clear diagonal footer edge */}
        <div className="max-w-screen-lg mx-auto px-4 py-12 md:py-16 pb-32 md:pb-48 lg:pb-64">
          <div className={isSuccess ? 'max-w-xl mx-auto' : 'max-w-xl'}>
            {isSuccess ? (
              /* Success State */
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <div className="flex justify-center mb-4">
                  <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Message sent!</h2>
                <p className="text-gray-600 mb-8">
                  Thanks for reaching out. Your message is on its way to our team and
                  we&apos;ll reply to the email address you provided.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="accent" onClick={handleSendAnother}>
                    Send Another Message
                  </Button>
                  <Button variant="primary" href="/" asChild>
                    Back to Home
                  </Button>
                </div>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="space-y-6 relative">
                {/* Error Banner */}
                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-red-700">{submitError}</p>
                  </div>
                )}

                {/* Name (required) */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="John Doe"
                    className={`${inputBaseStyles} ${errors.name ? inputErrorStyles : ''}`}
                    aria-required="true"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                  />
                  {errors.name && (
                    <p id="name-error" className="text-red-500 text-sm mt-1" role="alert">
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Email (required) */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="you@example.com"
                    className={`${inputBaseStyles} ${errors.email ? inputErrorStyles : ''}`}
                    aria-required="true"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : 'email-hint'}
                  />
                  {errors.email ? (
                    <p id="email-error" className="text-red-500 text-sm mt-1" role="alert">
                      {errors.email}
                    </p>
                  ) : (
                    <p id="email-hint" className="text-gray-500 text-sm mt-1">
                      We&apos;ll use this to reply to you.
                    </p>
                  )}
                </div>

                {/* Contact Type */}
                <div>
                  <label
                    htmlFor="contactType"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    What&apos;s this about? <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="contactType"
                      value={formData.contactType}
                      onChange={(e) => handleInputChange('contactType', e.target.value)}
                      className={`${inputBaseStyles} appearance-none pr-10 cursor-pointer`}
                      aria-required="true"
                    >
                      {CONTACT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Message (required) */}
                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    placeholder="How can we help?"
                    rows={5}
                    className={`${inputBaseStyles} resize-none ${errors.message ? inputErrorStyles : ''}`}
                    aria-required="true"
                    aria-invalid={!!errors.message}
                    aria-describedby={errors.message ? 'message-error' : undefined}
                  />
                  {errors.message && (
                    <p id="message-error" className="text-red-500 text-sm mt-1" role="alert">
                      {errors.message}
                    </p>
                  )}
                </div>

                {/* Honeypot field - hidden from users using sr-only */}
                <div className="sr-only" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input
                    type="text"
                    id="website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
      <ShapedSection shape="straight" variant="dark" compactTop={true}>
        <SiteFooter />
      </ShapedSection>
    </>
  );
}
