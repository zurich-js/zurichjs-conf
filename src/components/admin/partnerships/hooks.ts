/**
 * Partnership Admin Hooks
 * React Query mutations for partnership management
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import type {
  CreatePartnershipRequest,
  CouponType,
  VoucherCurrency,
  VoucherPurpose,
} from './types';
import { partnershipQueryKeys } from './api';

export function useCreatePartnership() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (data: CreatePartnershipRequest) => {
      const res = await fetch('/api/admin/partnerships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create partnership');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnershipQueryKeys.all });
      toast.success('Partnership Created', 'The partnership has been created successfully');
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });
}

export function useDeletePartnership() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/partnerships/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete partnership');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnershipQueryKeys.all });
      toast.success('Partnership Deleted', 'The partnership has been deleted');
    },
    onError: () => {
      toast.error('Error', 'Failed to delete partnership');
    },
  });
}

export interface CreateCouponData {
  code: string;
  type: CouponType;
  discount_percent?: number;
  discount_amount?: number;
  currency?: VoucherCurrency;
  restricted_product_ids: string[];
  max_redemptions?: number;
  expires_at?: string;
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ partnershipId, data }: { partnershipId: string; data: CreateCouponData }) => {
      const res = await fetch(`/api/admin/partnerships/${partnershipId}/coupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create coupon');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnershipQueryKeys.all });
      toast.success('Coupon Created', 'The coupon has been created in Stripe');
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ partnershipId, couponId }: { partnershipId: string; couponId: string }) => {
      const res = await fetch(`/api/admin/partnerships/${partnershipId}/coupons`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponId }),
      });
      if (!res.ok) throw new Error('Failed to delete coupon');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnershipQueryKeys.all });
      toast.success('Coupon Deleted', 'The coupon has been deleted');
    },
    onError: () => {
      toast.error('Error', 'Failed to delete coupon');
    },
  });
}

export interface CreateVouchersData {
  purpose: VoucherPurpose;
  amount: number;
  currency: VoucherCurrency;
  quantity: number;
  recipient_name?: string;
  recipient_email?: string;
}

export function useCreateVouchers() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ partnershipId, data }: { partnershipId: string; data: CreateVouchersData }) => {
      const res = await fetch(`/api/admin/partnerships/${partnershipId}/vouchers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create vouchers');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: partnershipQueryKeys.all });
      const count = data.vouchers?.length || 1;
      toast.success('Vouchers Created', `${count} voucher${count > 1 ? 's' : ''} created in Stripe`);
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });
}

export function useDeleteVoucher() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ partnershipId, voucherId }: { partnershipId: string; voucherId: string }) => {
      const res = await fetch(`/api/admin/partnerships/${partnershipId}/vouchers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherId }),
      });
      if (!res.ok) throw new Error('Failed to delete voucher');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnershipQueryKeys.all });
      toast.success('Voucher Deleted', 'The voucher has been deleted');
    },
    onError: () => {
      toast.error('Error', 'Failed to delete voucher');
    },
  });
}

export interface SendEmailOptions {
  include_coupons: boolean;
  include_vouchers: boolean;
  include_logo: boolean;
  custom_message?: string;
}

export function useSendPartnershipEmail(onSuccess?: () => void) {
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ partnershipId, options }: { partnershipId: string; options: SendEmailOptions }) => {
      const res = await fetch(`/api/admin/partnerships/${partnershipId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send email');
      }
      return res.json();
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });
}
