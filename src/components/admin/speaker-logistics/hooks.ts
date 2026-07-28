/**
 * Speaker Logistics Admin Hooks
 * TanStack Query hooks for the speaker logistics reconciliation tab
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import type { ActivityGuestFormData } from '@/lib/validations/speaker-logistics';
import {
  createActivityGuest,
  deleteActivityGuest,
  fetchActivityGuests,
  fetchSpeakerLogisticsOverview,
  speakerLogisticsQueryKeys,
  updateActivityGuest,
} from './api';

export function useSpeakerLogisticsOverview(enabled: boolean = true) {
  return useQuery({
    queryKey: speakerLogisticsQueryKeys.overview(),
    queryFn: fetchSpeakerLogisticsOverview,
    enabled,
  });
}

export function useActivityGuests(enabled: boolean = true) {
  return useQuery({
    queryKey: speakerLogisticsQueryKeys.guests(),
    queryFn: fetchActivityGuests,
    enabled,
  });
}

export function useCreateActivityGuest() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (input: ActivityGuestFormData) => createActivityGuest(input),
    onSuccess: (guest) => {
      queryClient.invalidateQueries({ queryKey: speakerLogisticsQueryKeys.guests() });
      toast.success('Guest added', `${guest.first_name} ${guest.last_name} added to the guest list.`);
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });
}

export function useUpdateActivityGuest() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ActivityGuestFormData }) =>
      updateActivityGuest(id, input),
    onSuccess: (guest) => {
      queryClient.invalidateQueries({ queryKey: speakerLogisticsQueryKeys.guests() });
      toast.success('Guest updated', `${guest.first_name} ${guest.last_name} saved.`);
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });
}

export function useDeleteActivityGuest() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteActivityGuest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: speakerLogisticsQueryKeys.guests() });
      toast.success('Guest removed', 'The guest was removed from the list.');
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });
}
