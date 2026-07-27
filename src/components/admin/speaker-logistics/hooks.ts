/**
 * Speaker Logistics Admin Hooks
 * TanStack Query hooks for the speaker logistics reconciliation tab
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import {
  fetchSpeakerLogisticsOverview,
  sendSpeakerLogisticsRequestsApi,
  speakerLogisticsQueryKeys,
} from './api';
import type { SendSpeakerLogisticsRequestsResponse } from './types';

export function useSpeakerLogisticsOverview(enabled: boolean = true) {
  return useQuery({
    queryKey: speakerLogisticsQueryKeys.overview(),
    queryFn: fetchSpeakerLogisticsOverview,
    enabled,
  });
}

export function useSendSpeakerLogisticsRequests() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ speakerIds, customMessage }: { speakerIds: string[]; customMessage?: string }) =>
      sendSpeakerLogisticsRequestsApi(speakerIds, customMessage),
    onSuccess: (result: SendSpeakerLogisticsRequestsResponse) => {
      queryClient.invalidateQueries({ queryKey: speakerLogisticsQueryKeys.overview() });
      if (result.failed > 0) {
        toast.error('Requests Partially Sent', `${result.sent} sent, ${result.failed} failed`);
      } else {
        toast.success('Requests Sent', `${result.sent} email(s) with unique logistics links sent`);
      }
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });
}
