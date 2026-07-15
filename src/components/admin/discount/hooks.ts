/**
 * Discount Admin Hooks
 * React Query hooks for the discount popup configuration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import {
  fetchDiscountConfigApi,
  updateDiscountConfigApi,
  discountAdminQueryKeys,
} from './api';
import type { DiscountConfigUpdateInput } from './types';

export function useDiscountConfig() {
  return useQuery({
    queryKey: discountAdminQueryKeys.config(),
    queryFn: fetchDiscountConfigApi,
  });
}

export function useUpdateDiscountConfig() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: DiscountConfigUpdateInput) => updateDiscountConfigApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discountAdminQueryKeys.config() });
      toast.success('Config Updated', 'Discount popup configuration saved');
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });
}
