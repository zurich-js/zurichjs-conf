/**
 * Hooks for reading and updating a ticket holder's apparel sizes (admin dashboard)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '@/lib/admin/query-keys';
import { fetchTicketApparel, updateTicketTshirtSize } from '@/lib/admin/apparel-api';
import type { TicketApparel } from '@/lib/types/ticket-apparel';
import type { ApparelSize } from '@/lib/types/ticket-constants';

export type { TicketApparel };

export function useTicketApparel(ticketId: string | null) {
  return useQuery({
    // 'disabled' sentinel keeps the key shape stable while the query is off
    queryKey: adminKeys.ticketApparel(ticketId ?? 'disabled'),
    queryFn: () => fetchTicketApparel(ticketId!),
    enabled: !!ticketId,
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useUpdateTicketTshirtSize(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tshirtSize: ApparelSize | null) => updateTicketTshirtSize(ticketId, tshirtSize),
    onSuccess: (data) => {
      queryClient.setQueryData(adminKeys.ticketApparel(ticketId), data);
      // The apparel tab aggregates sizes across all tickets
      void queryClient.invalidateQueries({ queryKey: adminKeys.apparel() });
    },
  });
}
