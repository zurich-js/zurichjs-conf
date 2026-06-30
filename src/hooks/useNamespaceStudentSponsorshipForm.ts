import { useMutation } from '@tanstack/react-query';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';
import {
  submitNamespaceStudentSponsorship,
  type NamespaceStudentSponsorshipSubmitRequest,
  type NamespaceStudentSponsorshipSubmitResponse,
} from '@/lib/api/namespace';
import { namespaceKeys } from '@/lib/query-keys';

export interface UseNamespaceStudentSponsorshipFormReturn {
  submit: (
    data: NamespaceStudentSponsorshipSubmitRequest
  ) => Promise<NamespaceStudentSponsorshipSubmitResponse>;
  isPending: boolean;
  isSuccess: boolean;
  error: string | null;
  reset: () => void;
}

export function useNamespaceStudentSponsorshipForm(): UseNamespaceStudentSponsorshipFormReturn {
  const mutation = useMutation({
    mutationKey: namespaceKeys.submitStudentSponsorship(),
    mutationFn: submitNamespaceStudentSponsorship,
    onSuccess: () => {
      analytics.track('form_submitted', {
        form_name: 'namespace_student_sponsorship',
        form_type: 'other',
        form_id: 'namespace_student_sponsorship',
        form_success: true,
      } as EventProperties<'form_submitted'>);
    },
    onError: (error: Error) => {
      analytics.error('Namespace student sponsorship form error', error, {
        type: 'network',
        severity: 'medium',
      });
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
