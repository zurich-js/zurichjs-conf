/**
 * CFP Travel Hooks
 * Hooks for managing travel, flights, and reimbursements
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { flightsQueryOptions, reimbursementsQueryOptions } from '@/lib/queries/cfp';
import { endpoints } from '@/lib/api';
import type { CfpSpeakerFlight, CfpSpeakerReimbursement } from '@/lib/types/cfp';

/**
 * Hook to fetch flights
 */
export function useCfpFlights() {
  const query = useQuery(flightsQueryOptions);

  return {
    flights: query.data?.flights ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

/**
 * Hook to add/update a flight
 */
export function useSaveFlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Partial<CfpSpeakerFlight> }) => {
      const url = id ? endpoints.cfp.flight(id) : endpoints.cfp.flights();
      const method = id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to save flight');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.flights() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.travel() });
    },
  });
}

/**
 * Hook to delete a flight
 */
export function useDeleteFlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(endpoints.cfp.flight(id), {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to delete flight');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.flights() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.travel() });
    },
  });
}

/**
 * Hook to fetch reimbursements
 */
export function useCfpReimbursements() {
  const query = useQuery(reimbursementsQueryOptions);

  return {
    reimbursements: query.data?.reimbursements ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

/**
 * Hook to submit a reimbursement request
 */
export function useSubmitReimbursement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<CfpSpeakerReimbursement>) => {
      const response = await fetch(endpoints.cfp.reimbursements(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to submit reimbursement');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.reimbursements() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.travel() });
    },
  });
}
