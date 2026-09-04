/**
 * Ticket Stock Admin Hooks
 * React Query hooks for the ticket stock limits
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import {
  fetchTicketStockConfigApi,
  updateTicketStockConfigApi,
  ticketStockQueryKeys,
} from './api';
import type { TicketStockConfigUpdateInput } from './types';

export function useTicketStockConfig() {
  return useQuery({
    queryKey: ticketStockQueryKeys.config(),
    queryFn: ({ signal }) => fetchTicketStockConfigApi(signal),
  });
}

export function useUpdateTicketStockConfig() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: TicketStockConfigUpdateInput) => updateTicketStockConfigApi(data),
    onSuccess: (response) => {
      // The PUT response already carries fresh counts, so seed the cache with
      // it instead of forcing a second round trip.
      queryClient.setQueryData(ticketStockQueryKeys.config(), response);
      toast.success('Stock limits updated', 'Ticket availability recalculated');
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });
}
