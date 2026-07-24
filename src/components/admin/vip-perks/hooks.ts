/**
 * VIP Perks Admin Hooks
 * React Query hooks for VIP perk management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import {
  fetchVipPerks,
  fetchVipPerkConfig,
  fetchVipPerkProducts,
  updateVipPerkConfigApi,
  createVipPerkApi,
  backfillVipPerksApi,
  sendVipPerkEmailApi,
  deactivateVipPerkApi,
  vipPerkQueryKeys,
} from './api';
import type { VipPerkConfig } from './types';

/** Perks list + stats — one endpoint, one query (`list()` key covers both). */
export function useVipPerks() {
  return useQuery({
    queryKey: vipPerkQueryKeys.list(),
    queryFn: ({ signal }) => fetchVipPerks(signal),
    staleTime: 60_000,
  });
}

export function useVipPerkConfig() {
  return useQuery({
    queryKey: vipPerkQueryKeys.config(),
    queryFn: ({ signal }) => fetchVipPerkConfig(signal),
  });
}

/** Stripe product reference list — changes rarely, cache generously. */
export function useVipPerkProducts() {
  return useQuery({
    queryKey: vipPerkQueryKeys.products(),
    queryFn: ({ signal }) => fetchVipPerkProducts(signal),
    staleTime: 10 * 60_000,
  });
}

export function useUpdateVipPerkConfig() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: {
      discount_percent?: number;
      restricted_product_ids?: string[];
      expires_at?: string | null;
      auto_send_email?: boolean;
      custom_email_message?: string | null;
    }) => updateVipPerkConfigApi(data),
    onSuccess: (config: VipPerkConfig) => {
      // The PUT returns the updated config — seed the cache immediately,
      // then invalidate so the server stays the source of truth.
      queryClient.setQueryData(vipPerkQueryKeys.config(), config);
      queryClient.invalidateQueries({ queryKey: vipPerkQueryKeys.config() });
      toast.success('Config Updated', 'VIP perk configuration saved');
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });
}

export function useCreateVipPerk() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: { ticket_id: string; send_email?: boolean; custom_message?: string }) =>
      createVipPerkApi(data),
    onSuccess: () => {
      // list() covers perks + stats (same endpoint/query)
      queryClient.invalidateQueries({ queryKey: vipPerkQueryKeys.list() });
      toast.success('Perk Created', 'VIP workshop discount code created');
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });
}

export function useBackfillVipPerks() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: { dry_run?: boolean; send_emails?: boolean; custom_message?: string }) =>
      backfillVipPerksApi(data),
    onSuccess: (result, variables) => {
      // Dry runs create nothing — skip the refetch. list() covers perks + stats.
      if (!variables.dry_run) {
        queryClient.invalidateQueries({ queryKey: vipPerkQueryKeys.list() });
      }
      if (result.created > 0) {
        toast.success('Backfill Complete', `Created ${result.created} perk(s), ${result.emails_sent} email(s) sent`);
      } else {
        toast.info('Backfill Complete', 'No new perks to create');
      }
    },
    onError: (error: Error) => {
      toast.error('Backfill Failed', error.message);
    },
  });
}

export function useSendVipPerkEmail() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ perkId, customMessage }: { perkId: string; customMessage?: string }) =>
      sendVipPerkEmailApi(perkId, customMessage),
    onSuccess: () => {
      // list() covers perks + stats (email status + emails_sent count)
      queryClient.invalidateQueries({ queryKey: vipPerkQueryKeys.list() });
      toast.success('Email Sent', 'VIP perk email sent successfully');
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });
}

export function useDeactivateVipPerk() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (perkId: string) => deactivateVipPerkApi(perkId),
    onSuccess: () => {
      // list() covers perks + stats (same endpoint/query)
      queryClient.invalidateQueries({ queryKey: vipPerkQueryKeys.list() });
      toast.success('Perk Deactivated', 'VIP perk has been deactivated');
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });
}
