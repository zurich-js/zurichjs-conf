/**
 * Hooks for reading and updating a ticket holder's apparel sizes (admin dashboard)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '@/lib/admin/query-keys';
import type { ApparelSize } from '@/lib/types/ticket-constants';

export interface TicketApparel {
  tshirtSize: string | null;
  hoodieSize: string | null;
}

async function fetchApparel(ticketId: string): Promise<TicketApparel> {
  const res = await fetch(`/api/admin/tickets/${ticketId}/apparel`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? 'Failed to fetch apparel sizes');
  }
  return await res.json() as TicketApparel;
}

async function updateTshirtSize(ticketId: string, tshirtSize: ApparelSize | null): Promise<TicketApparel> {
  const res = await fetch(`/api/admin/tickets/${ticketId}/apparel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tshirtSize }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? 'Failed to update t-shirt size');
  }
  return await res.json() as TicketApparel;
}

export function useTicketApparel(ticketId: string | null) {
  return useQuery({
    // 'disabled' sentinel keeps the key shape stable while the query is off
    queryKey: adminKeys.ticketApparel(ticketId ?? 'disabled'),
    queryFn: () => fetchApparel(ticketId!),
    enabled: !!ticketId,
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useUpdateTicketTshirtSize(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tshirtSize: ApparelSize | null) => updateTshirtSize(ticketId, tshirtSize),
    onSuccess: (data) => {
      queryClient.setQueryData(adminKeys.ticketApparel(ticketId), data);
      // The apparel tab aggregates sizes across all tickets
      void queryClient.invalidateQueries({ queryKey: adminKeys.apparel() });
    },
  });
}
