/**
 * Custom hook for voucher validation using TanStack Query
 */

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  ValidateVoucherRequest,
  ValidateVoucherResponse,
} from '@/pages/api/validate-voucher';

/**
 * Validate voucher code with Stripe.
 *
 * Uses `apiClient` so a non-JSON gateway error (HTML 502) surfaces as an
 * ApiError with the real status instead of a SyntaxError, and voucher
 * rejections carry their server-provided reason as the message. Rejections
 * are expected user input errors — skip PostHog capture; CartContext already
 * fires the voucher_apply_failed product event.
 */
export function useVoucherValidation() {
  return useMutation({
    mutationFn: (request: ValidateVoucherRequest) =>
      apiClient.post<ValidateVoucherResponse, ValidateVoucherRequest>(
        '/api/validate-voucher',
        request,
        { skipErrorCapture: true }
      ),
    retry: false, // Don't retry voucher validation
  });
}
