/**
 * Contact Form Hook
 * Handles contact form submission (inquiries & feedback) using TanStack Query.
 * Encapsulates the mutation, analytics tracking, and error surfacing.
 */

import { useMutation } from '@tanstack/react-query';
import { contactKeys } from '@/lib/query-keys';
import { submitContactMessage } from '@/lib/api/contact';
import type { ContactSubmitRequest, ContactSubmitResponse } from '@/lib/api/contact';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';

export interface UseContactFormOptions {
  /** Callback when submission succeeds */
  onSuccess?: () => void;
  /** Callback when submission fails (receives a user-facing message) */
  onError?: (message: string) => void;
}

export interface UseContactFormReturn {
  /** Submit the contact form; resolves on success, rejects on failure */
  submit: (data: ContactSubmitRequest) => Promise<ContactSubmitResponse>;
  /** Whether the submission is in flight */
  isPending: boolean;
  /** Whether the last submission succeeded */
  isSuccess: boolean;
  /** User-facing error message from the last failed submission, if any */
  error: string | null;
  /** Reset the mutation state (e.g. to send another message) */
  reset: () => void;
}

/**
 * Hook for submitting the contact form.
 * Uses a TanStack Query mutation so retries, pending state, and error handling
 * stay consistent with the rest of the app.
 */
export function useContactForm(options: UseContactFormOptions = {}): UseContactFormReturn {
  const { onSuccess, onError } = options;

  const mutation = useMutation({
    mutationKey: contactKeys.submit(),
    mutationFn: submitContactMessage,
    onSuccess: (_data, variables) => {
      analytics.track('form_submitted', {
        form_name: 'contact',
        form_type: 'contact',
        form_id: variables.contactType,
        form_success: true,
      } as EventProperties<'form_submitted'>);
      onSuccess?.();
    },
    onError: (mutationError: Error) => {
      analytics.error('Contact form error', mutationError, {
        type: 'network',
        severity: 'medium',
      });
      onError?.(mutationError.message);
    },
  });

  return {
    submit: mutation.mutateAsync,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error ? mutation.error.message : null,
    reset: mutation.reset,
  };
}
