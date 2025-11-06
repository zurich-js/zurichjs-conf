/**
 * Custom hook for voucher validation using TanStack Query
 */

import { useMutation } from '@tanstack/react-query';
import type {
  ValidateVoucherRequest,
  ValidateVoucherResponse,
} from '@/pages/api/validate-voucher';

/**
 * Validate voucher code with Stripe
 */
async function validateVoucher(
  request: ValidateVoucherRequest
): Promise<ValidateVoucherResponse> {
  const response = await fetch('/api/validate-voucher', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to validate voucher');
  }

  return response.json();
}

/**
 * Hook to validate voucher codes
 */
export function useVoucherValidation() {
  return useMutation({
    mutationFn: validateVoucher,
    retry: false, // Don't retry voucher validation
  });
}

