import React, { useState } from 'react';
import posthog from 'posthog-js';
import { AlertCircle, CheckCircle, ExternalLink, Send } from 'lucide-react';
import { Button } from '@/components/atoms';
import { useNamespaceStudentSponsorshipForm } from '@/hooks/useNamespaceStudentSponsorshipForm';
import type { NamespaceStudentSponsorshipSubmitRequest } from '@/lib/api/namespace';

const googleFormFallbackUrl =
  'https://docs.google.com/forms/d/e/1FAIpQLScpq-Orha6BeQ4SCSQ5XSeowrFybb-jg8Q7Xh1oh8hZnxc0-w/viewform';

export interface NamespaceStudentSponsorshipFormProps {
  fallbackUrl?: string;
}

interface FormState {
  fullName: string;
  email: string;
  universityName: string;
  degreeName: string;
  githubUrl: string;
  codeUrl: string;
  setupInstructions: string;
  prideExplanation: string;
  anythingElse: string;
  eligibilityConfirmed: boolean;
  website: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialFormState: FormState = {
  fullName: '',
  email: '',
  universityName: '',
  degreeName: '',
  githubUrl: '',
  codeUrl: '',
  setupInstructions: '',
  prideExplanation: '',
  anythingElse: '',
  eligibilityConfirmed: false,
  website: '',
};

const textFields = [
  {
    id: 'fullName',
    label: 'Full name',
    placeholder: 'Ada Lovelace',
    autoComplete: 'name',
  },
  {
    id: 'email',
    label: 'Email',
    placeholder: 'you@example.com',
    autoComplete: 'email',
    type: 'email',
  },
  {
    id: 'universityName',
    label: 'University name',
    placeholder: 'University of Zurich',
    autoComplete: 'organization',
  },
  {
    id: 'degreeName',
    label: 'Degree name',
    placeholder: "Bachelor's degree Computer Science",
    autoComplete: 'off',
  },
  {
    id: 'githubUrl',
    label: 'GitHub page',
    placeholder: 'https://github.com/your-handle',
    autoComplete: 'url',
    type: 'url',
  },
  {
    id: 'codeUrl',
    label: 'Code link',
    placeholder: 'https://github.com/your-handle/project',
    autoComplete: 'url',
    type: 'url',
  },
] as const;

const textAreaFields = [
  {
    id: 'setupInstructions',
    label: 'Setup instructions',
    hint: 'Text or a link to a README file.',
    placeholder: 'How should the reviewers run or inspect this project?',
    rows: 5,
  },
  {
    id: 'prideExplanation',
    label: 'Why are you proud of it?',
    hint: 'One or two paragraphs is enough.',
    placeholder: 'What problem did you solve, what did you learn, and why does it excite you?',
    rows: 5,
  },
  {
    id: 'anythingElse',
    label: "Anything else you'd like us to know?",
    hint: 'Optional.',
    placeholder: 'Optional context, constraints, or notes for the reviewers.',
    rows: 3,
  },
] as const;

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function NamespaceStudentSponsorshipForm({
  fallbackUrl = googleFormFallbackUrl,
}: NamespaceStudentSponsorshipFormProps) {
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const {
    submit,
    isPending: isSubmitting,
    isSuccess,
    error: submitError,
    reset,
  } = useNamespaceStudentSponsorshipForm();

  const updateField = <Key extends keyof FormState>(
    field: Key,
    value: FormState[Key]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};

    for (const field of textFields) {
      const value = formData[field.id].trim();
      if (!value) {
        nextErrors[field.id] = `${field.label} is required`;
      }
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = 'Enter a valid email address';
    }

    if (formData.githubUrl && !isValidUrl(formData.githubUrl)) {
      nextErrors.githubUrl = 'Enter a valid GitHub page URL';
    }

    if (formData.codeUrl && !isValidUrl(formData.codeUrl)) {
      nextErrors.codeUrl = 'Enter a valid code link URL';
    }

    if (formData.setupInstructions.trim().length < 20) {
      nextErrors.setupInstructions = 'Add at least 20 characters of setup instructions';
    }

    if (formData.prideExplanation.trim().length < 20) {
      nextErrors.prideExplanation = 'Add at least 20 characters explaining the project';
    }

    if (!formData.eligibilityConfirmed) {
      nextErrors.eligibilityConfirmed = 'Confirm eligibility before submitting';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

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

    const payload: NamespaceStudentSponsorshipSubmitRequest = {
      fullName: formData.fullName,
      email: formData.email,
      universityName: formData.universityName,
      degreeName: formData.degreeName,
      githubUrl: formData.githubUrl,
      codeUrl: formData.codeUrl,
      setupInstructions: formData.setupInstructions,
      prideExplanation: formData.prideExplanation,
      anythingElse: formData.anythingElse || undefined,
      eligibilityConfirmed: formData.eligibilityConfirmed,
      website: formData.website,
      posthogSessionId,
      posthogDistinctId,
    };

    try {
      await submit(payload);
    } catch {
      // The hook exposes the user-facing error state.
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setErrors({});
    reset();
  };

  const inputBaseStyles =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-primary focus:outline-none focus:ring-2 focus:ring-blue-primary/30';
  const inputErrorStyles = 'border-error focus:border-error focus:ring-error/30';

  if (isSuccess) {
    return (
      <div className="text-center">
        <CheckCircle className="mx-auto mb-4 h-12 w-12 text-success" aria-hidden="true" />
        <h2 className="mb-3 text-xl font-bold text-gray-900">
          Submission received
        </h2>
        <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-gray-600">
          Thanks for applying. Your submission has been submitted.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="blue" onClick={resetForm}>
            Submit another project
          </Button>
          <Button variant="dark" href={fallbackUrl} asChild>
            Form doesn't work? Click here
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="w-full"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Submit your project
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          This goes directly to the Namespace Student Sponsorship reviewers. If
          anything fails, use the Google Form fallback.
        </p>
      </div>

      {submitError && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-error/30 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
          <div>
            <p className="font-semibold text-red-800">{submitError}</p>
            <a
              href={fallbackUrl}
              className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-blue-primary underline"
            >
              Use the Google Form fallback
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {textFields.map((field) => {
          const fieldError = errors[field.id];
          return (
            <div key={field.id}>
              <label
                htmlFor={field.id}
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                {field.label} <span className="text-error">*</span>
              </label>
              <input
                id={field.id}
                type={'type' in field ? field.type : 'text'}
                autoComplete={field.autoComplete}
                value={formData[field.id]}
                onChange={(event) => updateField(field.id, event.target.value)}
                placeholder={field.placeholder}
                className={`${inputBaseStyles} ${fieldError ? inputErrorStyles : ''}`}
                aria-required="true"
                aria-invalid={!!fieldError}
                aria-describedby={fieldError ? `${field.id}-error` : undefined}
              />
              {fieldError && (
                <p id={`${field.id}-error`} className="mt-1 text-sm text-error" role="alert">
                  {fieldError}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 space-y-5">
        {textAreaFields.map((field) => {
          const fieldError = errors[field.id];
          const isRequired = field.id !== 'anythingElse';
          return (
            <div key={field.id}>
              <label
                htmlFor={field.id}
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                {field.label} {isRequired && <span className="text-error">*</span>}
              </label>
              <textarea
                id={field.id}
                rows={field.rows}
                value={formData[field.id]}
                onChange={(event) => updateField(field.id, event.target.value)}
                placeholder={field.placeholder}
                className={`${inputBaseStyles} resize-y ${fieldError ? inputErrorStyles : ''}`}
                aria-required={isRequired}
                aria-invalid={!!fieldError}
                aria-describedby={`${field.id}-hint${fieldError ? ` ${field.id}-error` : ''}`}
              />
              <p id={`${field.id}-hint`} className="mt-1 text-sm text-gray-500">
                {field.hint}
              </p>
              {fieldError && (
                <p id={`${field.id}-error`} className="mt-1 text-sm text-error" role="alert">
                  {fieldError}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-lg border border-blue-primary/20 bg-blue-primary/5 p-4">
        <label className="flex gap-3 text-sm leading-relaxed text-gray-700">
          <input
            type="checkbox"
            checked={formData.eligibilityConfirmed}
            onChange={(event) => updateField('eligibilityConfirmed', event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-primary focus:ring-blue-primary"
            aria-describedby={errors.eligibilityConfirmed ? 'eligibility-error' : undefined}
          />
          <span>
            I confirm I am a university student graduating in 2026 and agree that
            ZurichJS and Namespace may review my submission for this challenge.
          </span>
        </label>
        {errors.eligibilityConfirmed && (
          <p id="eligibility-error" className="mt-2 text-sm text-error" role="alert">
            {errors.eligibilityConfirmed}
          </p>
        )}
      </div>

      <div className="sr-only" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={formData.website}
          onChange={(event) => updateField('website', event.target.value)}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="submit"
          variant="blue"
          loading={isSubmitting}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? 'Submitting...' : 'Submit application'}
        </Button>
        <a
          href={fallbackUrl}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-blue-primary underline-offset-4 hover:underline"
        >
          Form doesn't work? Click here
        </a>
      </div>

      <noscript>
        <p className="mt-4 text-sm text-gray-600">
          JavaScript is required for the local form. Use the Google Form fallback:
          {' '}
          <a className="text-blue-primary underline" href={fallbackUrl}>
            {fallbackUrl}
          </a>
        </p>
      </noscript>
    </form>
  );
}
