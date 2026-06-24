/**
 * TanStack Query hooks for admin student/unemployed verification requests.
 * Wraps the /api/admin/verifications endpoints (list / approve / reject).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

export type VerificationStatusFilter = '' | 'pending' | 'approved' | 'rejected';

export interface VerificationRequest {
  id: string;
  verification_id: string;
  name: string;
  email: string;
  verification_type: 'student' | 'unemployed';
  student_id: string | null;
  university: string | null;
  linkedin_url: string | null;
  rav_registration_date: string | null;
  additional_info: string | null;
  price_id: string;
  country_code: string | null;
  currency: string | null;
  status: 'pending' | 'approved' | 'rejected';
  stripe_payment_link_id: string | null;
  stripe_payment_link_url: string | null;
  stripe_session_id: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface ApproveVerificationResponse {
  success: true;
  paymentLinkUrl: string;
  paymentLinkId: string;
}

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || fallbackMessage);
  return data as T;
}

/**
 * List verification requests, optionally filtered by status.
 * Pass `{ enabled: false }` to defer the fetch (e.g. until admin auth resolves).
 */
export function useVerifications(
  status: VerificationStatusFilter,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.verifications.list(status || undefined),
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const qs = params.toString();
      const response = await fetch(
        `/api/admin/verifications${qs ? `?${qs}` : ''}`,
        { credentials: 'include' }
      );
      const data = await readJson<{ verifications: VerificationRequest[] }>(
        response,
        'Failed to load verifications'
      );
      return data.verifications;
    },
  });
}

/**
 * Approve a verification request — creates a Stripe payment link and emails the applicant.
 */
export function useApproveVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/verifications/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      return readJson<ApproveVerificationResponse>(response, 'Failed to approve verification');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.verifications.all });
    },
  });
}

/**
 * Reject a verification request.
 */
export function useRejectVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/verifications/${id}/reject`, {
        method: 'POST',
        credentials: 'include',
      });
      return readJson<{ success?: boolean }>(response, 'Failed to reject verification');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.verifications.all });
    },
  });
}
