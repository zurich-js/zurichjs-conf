import React, { useEffect, useRef, useState } from 'react';
import posthog from 'posthog-js';
import { AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/atoms';
import { useNamespaceStudentSponsorshipForm } from '@/hooks/useNamespaceStudentSponsorshipForm';
import { captureNamespaceStudentSponsorshipLead } from '@/lib/api/namespace';
import type { NamespaceStudentSponsorshipSubmitRequest } from '@/lib/api/namespace';
import {
  namespaceStudentSponsorshipSchema,
  type NamespaceStudentSponsorshipFormData,
} from '@/lib/validations/namespace';

const googleFormFallbackUrl =
  'https://docs.google.com/forms/d/e/1FAIpQLScpq-Orha6BeQ4SCSQ5XSeowrFybb-jg8Q7Xh1oh8hZnxc0-w/viewform';

export interface NamespaceStudentSponsorshipFormProps {
  fallbackUrl?: string;
}

interface FormState {
  applicationId: string;
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
  processingConsent: boolean;
  website: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;
type ValidatedField = Exclude<keyof FormState, 'website'>;

const initialFormState: FormState = {
  applicationId: '',
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
  processingConsent: false,
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

export function NamespaceStudentSponsorshipForm({
  fallbackUrl = googleFormFallbackUrl,
}: NamespaceStudentSponsorshipFormProps) {
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const savedLeadSnapshots = useRef(new Set<string>());
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

  const updateFieldAndSave = <Key extends keyof FormState>(
    field: Key,
    value: FormState[Key]
  ) => {
    const nextData = { ...formData, [field]: value };
    updateField(field, value);
    void saveApplicationProgress(nextData);
  };

  const setFieldError = (field: ValidatedField, message?: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const getPosthogIds = () => {
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

    return { posthogSessionId, posthogDistinctId };
  };

  const saveApplicationProgress = async (data: FormState) => {
    const emailResult = namespaceStudentSponsorshipSchema.shape.email.safeParse(data.email);

    if (!emailResult.success || !data.processingConsent) {
      return;
    }

    const payload = {
      applicationId: data.applicationId || undefined,
      email: emailResult.data,
      fullName: data.fullName,
      universityName: data.universityName,
      degreeName: data.degreeName,
      githubUrl: data.githubUrl,
      codeUrl: data.codeUrl,
      setupInstructions: data.setupInstructions,
      prideExplanation: data.prideExplanation,
      anythingElse: data.anythingElse,
      processingConsent: data.processingConsent,
      ...getPosthogIds(),
    };
    const snapshot = JSON.stringify(payload);

    if (savedLeadSnapshots.current.has(snapshot)) {
      return;
    }

    savedLeadSnapshots.current.add(snapshot);

    try {
      const response = await captureNamespaceStudentSponsorshipLead(payload);

      if (response.applicationId && response.applicationId !== data.applicationId) {
        setFormData((prev) => ({ ...prev, applicationId: response.applicationId || '' }));
        window.localStorage.setItem(
          'namespaceStudentSponsorshipApplicationId',
          response.applicationId
        );
      }
    } catch {
      savedLeadSnapshots.current.delete(snapshot);
    }
  };

  const validateField = (field: ValidatedField) => {
    const result = namespaceStudentSponsorshipSchema.shape[field].safeParse(
      formData[field]
    );

    setFieldError(field, result.success ? undefined : result.error.issues[0]?.message);

    return result;
  };

  const handleFieldBlur = (field: ValidatedField) => {
    const result = validateField(field);

    if (field === 'email' && result.success) {
      void saveApplicationProgress(formData);
      return;
    }

    void saveApplicationProgress(formData);
  };

  const validateForm = (): NamespaceStudentSponsorshipFormData | null => {
    const result = namespaceStudentSponsorshipSchema.safeParse(formData);

    if (result.success) {
      setErrors({});
      return result.data;
    }

    const nextErrors: FormErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof FormState | undefined;
      if (field && field in formData && !nextErrors[field]) {
        nextErrors[field] = issue.message;
      }
    }

    setErrors(nextErrors);
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validatedData = validateForm();

    if (!validatedData) {
      return;
    }

    const { posthogSessionId, posthogDistinctId } = getPosthogIds();

    const payload: NamespaceStudentSponsorshipSubmitRequest = {
      applicationId: validatedData.applicationId,
      fullName: validatedData.fullName,
      email: validatedData.email,
      universityName: validatedData.universityName,
      degreeName: validatedData.degreeName,
      githubUrl: validatedData.githubUrl,
      codeUrl: validatedData.codeUrl,
      setupInstructions: validatedData.setupInstructions,
      prideExplanation: validatedData.prideExplanation,
      anythingElse: validatedData.anythingElse || undefined,
      eligibilityConfirmed: validatedData.eligibilityConfirmed,
      processingConsent: validatedData.processingConsent,
      website: validatedData.website,
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
    window.localStorage.removeItem('namespaceStudentSponsorshipApplicationId');
    reset();
  };

  const inputBaseStyles =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-primary focus:outline-none focus:ring-2 focus:ring-blue-primary/30';
  const inputErrorStyles = 'border-error focus:border-error focus:ring-error/30';

  useEffect(() => {
    if (!isSuccess) {
      return;
    }

    document.querySelector('#apply')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [isSuccess]);

  useEffect(() => {
    const applicationId = window.localStorage.getItem(
      'namespaceStudentSponsorshipApplicationId'
    );

    if (applicationId) {
      setFormData((prev) => ({ ...prev, applicationId }));
    }
  }, []);

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
          This goes directly to the Namespace Student Sponsorship reviewers.
        </p>
      </div>

      {submitError && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-error/30 bg-red-50 p-4">
          <AlertCircle className="size-4 shrink-0 text-error" aria-hidden="true" />
          <div>
            <p className="font-semibold text-red-800">
              {submitError}{" "}
              <a
                  href={fallbackUrl}
                  className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-blue-primary underline"
              >
                Use the Google Form fallback
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </p>
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
                onBlur={() => handleFieldBlur(field.id)}
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
                onBlur={() => handleFieldBlur(field.id)}
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

      <div className="mt-5">
        <label className="flex gap-3 text-sm leading-relaxed text-gray-700">
          <input
            type="checkbox"
            checked={formData.eligibilityConfirmed}
            onChange={(event) => updateField('eligibilityConfirmed', event.target.checked)}
            onBlur={() => handleFieldBlur('eligibilityConfirmed')}
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

      <div className="mt-5">
        <label className="flex gap-3 text-sm leading-relaxed text-gray-700">
          <input
            type="checkbox"
            checked={formData.processingConsent}
            onChange={(event) => updateFieldAndSave('processingConsent', event.target.checked)}
            onBlur={() => handleFieldBlur('processingConsent')}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-primary focus:ring-blue-primary"
            aria-describedby={errors.processingConsent ? 'processing-consent-error' : undefined}
          />
          <span>
            I agree that ZurichJS may process my application details and send them to
            Namespace to manage the student sponsorship application.
          </span>
        </label>
        {errors.processingConsent && (
          <p id="processing-consent-error" className="mt-2 text-sm text-error" role="alert">
            {errors.processingConsent}
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
