/**
 * Report Issue Page
 * Form for users to report typos, bugs, and issues on the website
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import posthog from 'posthog-js';
import { DynamicSiteFooter, ShapedSection } from '@/components/organisms';
import { Button, Heading, Kicker } from '@/components/atoms';
import { SEO } from '@/components/SEO';
import { ISSUE_TYPES, type IssueType } from '@/lib/validations/issue-report';
import { CheckCircle, AlertCircle, Bug, ChevronDown } from 'lucide-react';

interface FormData {
  name: string;
  email: string;
  issueType: IssueType;
  pageUrl: string;
  description: string;
  screenshotUrl: string;
  website: string; // Honeypot field
}

interface FormErrors {
  name?: string;
  email?: string;
  issueType?: string;
  pageUrl?: string;
  description?: string;
  screenshotUrl?: string;
}

const initialFormData: FormData = {
  name: '',
  email: '',
  issueType: 'typo',
  pageUrl: '',
  description: '',
  screenshotUrl: '',
  website: '',
};

export default function ReportIssuePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Prefill URL from query parameter or current referrer
  useEffect(() => {
    if (router.isReady) {
      const urlParam = router.query.url;
      if (typeof urlParam === 'string') {
        // Don't prefill with the report-issue page itself
        try {
          const url = new URL(urlParam);
          if (!url.pathname.includes('/report-issue')) {
            setFormData((prev) => ({ ...prev, pageUrl: urlParam }));
          }
        } catch {
          // Invalid URL, try to use it anyway
          if (!urlParam.includes('/report-issue')) {
            setFormData((prev) => ({ ...prev, pageUrl: urlParam }));
          }
        }
      } else if (typeof document !== 'undefined' && document.referrer) {
        // Use referrer if no URL param and referrer is from same domain
        try {
          const referrerUrl = new URL(document.referrer);
          if (
            referrerUrl.hostname === window.location.hostname &&
            !referrerUrl.pathname.includes('/report-issue')
          ) {
            setFormData((prev) => ({ ...prev, pageUrl: document.referrer }));
          }
        } catch {
          // Invalid referrer URL, ignore
        }
      }
    }
  }, [router.isReady, router.query.url]);

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

    // Name validation (required)
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Page URL validation (optional but must be valid if provided)
    if (formData.pageUrl.trim()) {
      try {
        new URL(formData.pageUrl);
      } catch {
        newErrors.pageUrl = 'Please enter a valid URL';
      }
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    // Screenshot URL validation (optional but must be valid if provided)
    if (formData.screenshotUrl.trim()) {
      try {
        new URL(formData.screenshotUrl);
      } catch {
        newErrors.screenshotUrl = 'Please enter a valid URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

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

    try {
      const response = await fetch('/api/report-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name || undefined,
          email: formData.email,
          issueType: formData.issueType,
          pageUrl: formData.pageUrl,
          description: formData.description,
          screenshotUrl: formData.screenshotUrl || undefined,
          website: formData.website, // Honeypot
          posthogSessionId,
          posthogDistinctId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setIsSuccess(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'An error occurred. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportAnother = () => {
    setFormData(initialFormData);
    setErrors({});
    setIsSuccess(false);
    setSubmitError(null);
  };

  // Light-themed input styles
  const inputBaseStyles =
    'w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all duration-200';
  const inputErrorStyles = 'border-red-500 focus:ring-red-500';

  return (
    <>
      <SEO
        title="Report an Issue | ZurichJS Conference 2026"
        description="Found a typo, broken link, or bug on our website? Report it here and help us improve. Valid reports may receive a discount code or workshop voucher as a thank you."
        canonical="/report-issue"
      />

      <main className="min-h-screen bg-white">
        {/* Header Section */}
        <div className="bg-brand-black pt-28 pb-16 md:pt-36 md:pb-20">
          <div className="max-w-screen-lg mx-auto px-4">
            <div className="flex items-center gap-3 mb-4">
              <Bug className="w-8 h-8 text-brand-primary" />
              <Kicker>Feedback</Kicker>
            </div>
            <Heading level="h1" className="mb-4">
              Report an Issue
            </Heading>
            <p className="text-brand-gray-light text-lg max-w-2xl">
              Found a typo, broken link, or something that doesn&apos;t look right?
              Let us know and help us improve the experience for everyone.
            </p>
            <div className="mt-4 p-4 bg-brand-primary/10 border border-brand-primary/30 rounded-lg">
              <p className="text-brand-primary font-medium">
                As a thank you, if we fix an issue you reported, we&apos;ll send you a
                conference ticket discount code or a workshop voucher!
              </p>
            </div>
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
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Thank You!</h2>
                <p className="text-gray-600 mb-6">
                  Your report has been submitted successfully.
                </p>
                <p className="text-gray-600 mb-8">
                  If it&apos;s valid, we&apos;ll email you a discount code or workshop
                  voucher as a thank you for helping us improve.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="accent" onClick={handleReportAnother}>
                    Report Another Issue
                  </Button>
                  <Button variant="primary" href="/">
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
                      We&apos;ll use this to send you a reward if your report is valid.
                    </p>
                  )}
                </div>

                {/* Issue Type */}
                <div>
                  <label
                    htmlFor="issueType"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Issue Type <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="issueType"
                      value={formData.issueType}
                      onChange={(e) => handleInputChange('issueType', e.target.value)}
                      className={`${inputBaseStyles} appearance-none pr-10 cursor-pointer`}
                      aria-required="true"
                    >
                      {ISSUE_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Page URL (optional) */}
                <div>
                  <label
                    htmlFor="pageUrl"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Page URL{' '}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="pageUrl"
                    type="url"
                    value={formData.pageUrl}
                    onChange={(e) => handleInputChange('pageUrl', e.target.value)}
                    placeholder="https://zurichjs.com/..."
                    className={`${inputBaseStyles} ${errors.pageUrl ? inputErrorStyles : ''}`}
                    aria-invalid={!!errors.pageUrl}
                    aria-describedby={errors.pageUrl ? 'pageUrl-error' : 'pageUrl-hint'}
                  />
                  {errors.pageUrl ? (
                    <p id="pageUrl-error" className="text-red-500 text-sm mt-1" role="alert">
                      {errors.pageUrl}
                    </p>
                  ) : (
                    <p id="pageUrl-hint" className="text-gray-500 text-sm mt-1">
                      The URL of the page where you found the issue (if you remember).
                    </p>
                  )}
                </div>

                {/* Description (required) */}
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe the issue you found..."
                    rows={4}
                    className={`${inputBaseStyles} resize-none ${errors.description ? inputErrorStyles : ''}`}
                    aria-required="true"
                    aria-invalid={!!errors.description}
                    aria-describedby={errors.description ? 'description-error' : undefined}
                  />
                  {errors.description && (
                    <p id="description-error" className="text-red-500 text-sm mt-1" role="alert">
                      {errors.description}
                    </p>
                  )}
                </div>

                {/* Screenshot URL (optional) */}
                <div>
                  <label
                    htmlFor="screenshotUrl"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Screenshot URL{' '}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="screenshotUrl"
                    type="url"
                    value={formData.screenshotUrl}
                    onChange={(e) => handleInputChange('screenshotUrl', e.target.value)}
                    placeholder="https://..."
                    className={`${inputBaseStyles} ${errors.screenshotUrl ? inputErrorStyles : ''}`}
                    aria-invalid={!!errors.screenshotUrl}
                    aria-describedby={
                      errors.screenshotUrl ? 'screenshotUrl-error' : 'screenshotUrl-hint'
                    }
                  />
                  {errors.screenshotUrl ? (
                    <p
                      id="screenshotUrl-error"
                      className="text-red-500 text-sm mt-1"
                      role="alert"
                    >
                      {errors.screenshotUrl}
                    </p>
                  ) : (
                    <p id="screenshotUrl-hint" className="text-gray-500 text-sm mt-1">
                      Upload to Dropbox, Google Drive, or any image sharing service and
                      paste the link here.
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
                    {isSubmitting ? 'Submitting...' : 'Submit Report'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <ShapedSection shape="tighten" variant="dark" dropBottom>
        <DynamicSiteFooter />
      </ShapedSection>
    </>
  );
}
