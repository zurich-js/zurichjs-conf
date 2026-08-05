/**
 * Discount Admin Hooks
 * React Query hooks for the discount popup configuration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import {
  fetchDiscountConfigApi,
  updateDiscountConfigApi,
  createCorporateLinkApi,
  discountAdminQueryKeys,
} from './api';
import type { CorporateLinkInput, DiscountConfigUpdateInput } from './types';

export function useDiscountConfig() {
  return useQuery({
    queryKey: discountAdminQueryKeys.config(),
    queryFn: fetchDiscountConfigApi,
  });
}

export function useCreateCorporateLink() {
  const toast = useToast();

  return useMutation({
    mutationFn: (data: CorporateLinkInput) => createCorporateLinkApi(data),
    onSuccess: (result) => {
      toast.success('Link created', `Corporate access link ready for ${result.label}`);
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
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
