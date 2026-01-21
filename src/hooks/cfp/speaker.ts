/**
 * CFP Speaker Hooks
 * Hooks for fetching and managing speaker profile
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { speakerQueryOptions } from '@/lib/queries/cfp';
import { endpoints } from '@/lib/api';
import { captureException } from '@/lib/analytics/helpers';
import type { CfpSpeaker } from '@/lib/types/cfp';

/**
 * Hook to fetch current speaker profile
 */
export function useCfpSpeaker() {
  const query = useQuery(speakerQueryOptions);

  return {
    speaker: query.data?.speaker ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

/**
 * Hook to update speaker profile
 */
export function useUpdateSpeaker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<CfpSpeaker>) => {
      const response = await fetch(endpoints.cfp.speaker(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to update profile');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.speaker() });
    },
    onError: (error) => {
      captureException(error, {
        type: 'network',
        severity: 'medium',
        flow: 'cfp_speaker',
        action: 'update_profile',
      });
    },
  });
}
